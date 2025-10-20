<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\OnboardingRecord;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class OnboardingController extends Controller
{
    /**
     * Get all ShortListed and Interview applicants with their onboarding data
     * This fetches from job_applications where status = 'ShortListed' or 'Interview' 
     * and joins with onboarding_records for additional onboarding data
     */
    public function getOnboardingRecords(Request $request): JsonResponse
    {
        try {
            Log::info('OnboardingController: Fetching ShortListed and Interview applicants for onboarding');
            
            // Get all ShortListed and Interview job applications with their onboarding data
            $shortListedApplicants = DB::table('applications')
                ->leftJoin('onboarding_records', 'applications.id', '=', 'onboarding_records.application_id')
                ->leftJoin('job_postings', 'applications.job_posting_id', '=', 'job_postings.id')
                ->leftJoin('applicants', 'applications.applicant_id', '=', 'applicants.id')
                ->leftJoin('interviews', 'applications.id', '=', 'interviews.application_id')
                ->whereIn('applications.status', ['ShortListed', 'Interview'])
                ->select([
                    'applications.id',
                    'applicants.first_name',
                    'applicants.last_name',
                    'applicants.email',
                    'applicants.contact_number as phone',
                    'job_postings.position',
                    'job_postings.department',
                    'applications.status as application_status',
                    'applications.applied_at as applied_date',
                    'applications.updated_at as application_updated_at',
                    'applications.resume_path',
                    // Onboarding specific fields (from onboarding_records table)
                    'onboarding_records.id as onboarding_id',
                    'onboarding_records.onboarding_status',
                    'onboarding_records.progress',
                    'onboarding_records.start_date',
                    'onboarding_records.notes as onboarding_notes',
                    'onboarding_records.created_at as onboarding_created_at',
                    'onboarding_records.updated_at as onboarding_updated_at',
                    // Interview fields
                    'interviews.id as interview_id',
                    'interviews.interview_date',
                    'interviews.interview_time',
                    'interviews.interview_type',
                    'interviews.location as interview_location',
                    'interviews.interviewer',
                    'interviews.status as interview_status'
                ])
                ->orderBy('applications.updated_at', 'desc')
                ->get();

            Log::info('OnboardingController: Found ' . $shortListedApplicants->count() . ' ShortListed and Interview applicants');
            
            // Transform data for frontend consumption
            $onboardingData = $shortListedApplicants->map(function ($applicant) {
                return [
                    'id' => $applicant->id,
                    'application_id' => $applicant->id,
                    'onboarding_id' => $applicant->onboarding_id,
                    
                    // Employee information from job application
                    'employee_name' => $applicant->first_name . ' ' . $applicant->last_name,
                    'employee_email' => $applicant->email,
                    'phone' => $applicant->phone,
                    'position' => $applicant->position,
                    'department' => $applicant->department ?? 'Not Specified',
                    
                    // Application info
                    'application_status' => $applicant->interview_id ? 'On Interview' : $applicant->application_status,
                    'applied_date' => $applicant->applied_date,
                    'application_updated_at' => $applicant->application_updated_at,
                    'resume_path' => $applicant->resume_path,
                    
                    // Onboarding specific data (with defaults if no onboarding record exists)
                    'status' => $applicant->onboarding_status ?? 'pending_documents',
                    'progress' => (int) ($applicant->progress ?? 0),
                    'start_date' => $applicant->start_date ?? Carbon::now()->addWeeks(2)->format('Y-m-d'),
                    'onboarding_notes' => $applicant->onboarding_notes ?? '',
                    
                    // Interview data
                    'interview_id' => $applicant->interview_id,
                    'interview_date' => $applicant->interview_date,
                    'interview_time' => $applicant->interview_time,
                    'interview_type' => $applicant->interview_type,
                    'interview_location' => $applicant->interview_location,
                    'interviewer' => $applicant->interviewer,
                    'interview_status' => $applicant->interview_status,
                    
                    // Timestamps
                    'created_at' => $applicant->onboarding_created_at ?? $applicant->applied_date,
                    'updated_at' => $applicant->onboarding_updated_at ?? $applicant->application_updated_at,
                ];
            });

            return response()->json($onboardingData, 200);
            
        } catch (\Exception $e) {
            Log::error('OnboardingController: Error fetching onboarding records', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to fetch onboarding records',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update onboarding status and data for a specific applicant
     * This creates or updates the onboarding_records table while keeping
     * the original job application data intact
     */
    public function updateOnboardingRecord(Request $request, $applicationId): JsonResponse
    {
        try {
            Log::info("OnboardingController: Updating onboarding record for application ID: {$applicationId}");
            Log::info("OnboardingController: Update data", $request->all());
            
            // Validate that the job application exists and is ShortListed or Interview
            $jobApplication = Application::where('id', $applicationId)
                ->whereIn('status', ['ShortListed', 'Interview'])
                ->with(['jobPosting', 'applicant'])
                ->first();
                
            if (!$jobApplication) {
                return response()->json([
                    'error' => 'Job application not found or not ShortListed/Interview',
                    'message' => 'Only ShortListed or Interview applicants can have onboarding records updated'
                ], 404);
            }

            // Validate request data
            $validatedData = $request->validate([
                'status' => 'nullable|in:pending_documents,documents_approved,orientation_scheduled,completed',
                'progress' => 'nullable|integer|min:0|max:100',
                'start_date' => 'nullable|date',
                'notes' => 'nullable|string|max:1000'
            ]);

            // Create or update onboarding record
            $onboardingRecord = OnboardingRecord::updateOrCreate(
                ['application_id' => $applicationId],
                [
                    'employee_name' => $jobApplication->applicant->first_name . ' ' . $jobApplication->applicant->last_name,
                    'employee_email' => $jobApplication->applicant->email,
                    'position' => $jobApplication->jobPosting->position,
                    'department' => $jobApplication->jobPosting->department ?? 'Not Specified',
                    'onboarding_status' => $validatedData['status'] ?? 'pending_documents',
                    'progress' => $validatedData['progress'] ?? 0,
                    'start_date' => $validatedData['start_date'] ?? Carbon::now()->addWeeks(2)->format('Y-m-d'),
                    'notes' => $validatedData['notes'] ?? '',
                    'updated_at' => Carbon::now()
                ]
            );

            Log::info("OnboardingController: Successfully updated onboarding record", [
                'application_id' => $applicationId,
                'onboarding_id' => $onboardingRecord->id,
                'status' => $onboardingRecord->onboarding_status
            ]);

            // Return updated data in the same format as getOnboardingRecords
            $responseData = [
                'id' => $jobApplication->id,
                'application_id' => $jobApplication->id,
                'onboarding_id' => $onboardingRecord->id,
                
                'employee_name' => $jobApplication->applicant->first_name . ' ' . $jobApplication->applicant->last_name,
                'employee_email' => $jobApplication->applicant->email,
                'phone' => $jobApplication->applicant->contact_number,
                'position' => $jobApplication->jobPosting->position,
                'department' => $jobApplication->jobPosting->department ?? 'Not Specified',
                
                'application_status' => $jobApplication->status,
                'status' => $onboardingRecord->onboarding_status,
                'progress' => (int) $onboardingRecord->progress,
                'start_date' => $onboardingRecord->start_date,
                'onboarding_notes' => $onboardingRecord->notes,
                
                'created_at' => $onboardingRecord->created_at,
                'updated_at' => $onboardingRecord->updated_at,
            ];

            return response()->json([
                'message' => 'Onboarding record updated successfully',
                'data' => $responseData
            ], 200);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
            
        } catch (\Exception $e) {
            Log::error('OnboardingController: Error updating onboarding record', [
                'application_id' => $applicationId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to update onboarding record',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific onboarding record by application ID
     */
    public function getOnboardingRecord($applicationId): JsonResponse
    {
        try {
            Log::info("OnboardingController: Fetching onboarding record for application ID: {$applicationId}");
            
            // Get the specific ShortListed or Interview application with onboarding data
            $applicantData = DB::table('applications')
                ->leftJoin('onboarding_records', 'applications.id', '=', 'onboarding_records.application_id')
                ->leftJoin('job_postings', 'applications.job_posting_id', '=', 'job_postings.id')
                ->leftJoin('applicants', 'applications.applicant_id', '=', 'applicants.id')
                ->leftJoin('interviews', 'applications.id', '=', 'interviews.application_id')
                ->where('applications.id', $applicationId)
                ->whereIn('applications.status', ['ShortListed', 'Interview'])
                ->select([
                    'applications.id',
                    'applicants.first_name',
                    'applicants.last_name',
                    'applicants.email',
                    'applicants.contact_number as phone',
                    'job_postings.position',
                    'job_postings.department',
                    'applications.status as application_status',
                    'applications.applied_at as applied_date',
                    'applications.updated_at as application_updated_at',
                    'applications.resume_path',
                    'onboarding_records.id as onboarding_id',
                    'onboarding_records.onboarding_status',
                    'onboarding_records.progress',
                    'onboarding_records.start_date',
                    'onboarding_records.notes as onboarding_notes',
                    'onboarding_records.created_at as onboarding_created_at',
                    'onboarding_records.updated_at as onboarding_updated_at',
                    // Interview fields
                    'interviews.id as interview_id',
                    'interviews.interview_date',
                    'interviews.interview_time',
                    'interviews.interview_type',
                    'interviews.location as interview_location',
                    'interviews.interviewer',
                    'interviews.status as interview_status'
                ])
                ->first();

            if (!$applicantData) {
                return response()->json([
                    'error' => 'ShortListed or Interview applicant not found',
                    'message' => 'No ShortListed or Interview applicant found with the specified ID'
                ], 404);
            }

            // Transform data
            $responseData = [
                'id' => $applicantData->id,
                'application_id' => $applicantData->id,
                'onboarding_id' => $applicantData->onboarding_id,
                
                'employee_name' => $applicantData->first_name . ' ' . $applicantData->last_name,
                'employee_email' => $applicantData->email,
                'phone' => $applicantData->phone,
                'position' => $applicantData->position,
                'department' => $applicantData->department ?? 'Not Specified',
                
                'application_status' => $applicantData->interview_id ? 'On Interview' : $applicantData->application_status,
                'resume_path' => $applicantData->resume_path,
                'status' => $applicantData->onboarding_status ?? 'pending_documents',
                'progress' => (int) ($applicantData->progress ?? 0),
                'start_date' => $applicantData->start_date ?? Carbon::now()->addWeeks(2)->format('Y-m-d'),
                'onboarding_notes' => $applicantData->onboarding_notes ?? '',
                
                // Interview data
                'interview_id' => $applicantData->interview_id,
                'interview_date' => $applicantData->interview_date,
                'interview_time' => $applicantData->interview_time,
                'interview_type' => $applicantData->interview_type,
                'interview_location' => $applicantData->interview_location,
                'interviewer' => $applicantData->interviewer,
                'interview_status' => $applicantData->interview_status,
                
                'created_at' => $applicantData->onboarding_created_at ?? $applicantData->applied_date,
                'updated_at' => $applicantData->onboarding_updated_at ?? $applicantData->application_updated_at,
            ];

            return response()->json($responseData, 200);
            
        } catch (\Exception $e) {
            Log::error('OnboardingController: Error fetching onboarding record', [
                'application_id' => $applicationId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to fetch onboarding record',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get onboarding record by user ID
     */
    public function getOnboardingRecordByUserId($userId): JsonResponse
    {
        try {
            Log::info("OnboardingController: Fetching onboarding record for user ID: {$userId}");
            
            // Get the onboarding record by user ID
            $onboardingRecord = OnboardingRecord::whereHas('jobApplication', function($query) use ($userId) {
                $query->whereHas('applicant', function($q) use ($userId) {
                    $q->where('user_id', $userId);
                });
            })->first();

            if (!$onboardingRecord) {
                return response()->json([
                    'error' => 'Onboarding record not found',
                    'message' => 'No onboarding record found for this user'
                ], 404);
            }

            return response()->json($onboardingRecord, 200);
            
        } catch (\Exception $e) {
            Log::error('OnboardingController: Error fetching onboarding record by user ID', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to fetch onboarding record',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}