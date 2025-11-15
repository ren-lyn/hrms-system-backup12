<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\BenefitClaim;
use App\Models\User;
use App\Models\EmployeeProfile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use App\Notifications\BenefitClaimStatusChanged;

class BenefitClaimController extends Controller
{
    /**
     * Get all benefit claims (for HR Assistant)
     */
    public function index(Request $request)
    {
        try {
            $query = BenefitClaim::with(['user.employeeProfile', 'employeeProfile', 'reviewedBy'])
                ->orderBy('created_at', 'desc');

            // Filter by status
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            // Filter by benefit type
            if ($request->has('benefit_type')) {
                $query->where('benefit_type', $request->benefit_type);
            }

            // Search by employee name
            if ($request->has('search')) {
                $search = $request->search;
                $query->whereHas('user', function($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%");
                })->orWhereHas('employeeProfile', function($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%");
                });
            }

            $claims = $query->get();

            return response()->json([
                'success' => true,
                'data' => $claims
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching benefit claims: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch benefit claims'
            ], 500);
        }
    }

    /**
     * Get benefit claims for the logged-in employee
     */
    public function myClaims()
    {
        try {
            $user = Auth::user();
            
            $claims = BenefitClaim::where('user_id', $user->id)
                ->with(['reviewedBy'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $claims
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching my benefit claims: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch your benefit claims'
            ], 500);
        }
    }

    /**
     * File a new benefit claim (for Employee)
     */
    public function store(Request $request)
    {
        try {
            // Custom validation for supporting documents array
            $rules = [
                'benefit_type' => 'required|in:sss,philhealth,pagibig',
                'claim_type' => 'required|string|max:255',
                'description' => 'required|string|min:10',
                'application_form' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120', // 5MB max - required application form
            ];

            // Handle supporting documents - can be single file or array
            // Check if files are sent as array format (supporting_documents[0], supporting_documents[1], etc.)
            $allFiles = $request->allFiles();
            $hasSupportingDocsArray = false;
            $hasSupportingDocs = false;
            
            // Check for array format files - Laravel normalizes supporting_documents[0] to supporting_documents.0
            foreach ($allFiles as $key => $file) {
                if (preg_match('/^supporting_documents\.(\d+)$/', $key)) {
                    $hasSupportingDocsArray = true;
                    $hasSupportingDocs = true;
                    break;
                }
            }
            
            // Check for single file format
            if (!$hasSupportingDocsArray && $request->hasFile('supporting_documents')) {
                $hasSupportingDocs = true;
            }
            
            // Only add validation rules if supporting documents are actually present
            if ($hasSupportingDocs) {
                if ($hasSupportingDocsArray) {
                    // For array format, manually validate files instead of using Laravel validator
                    // This avoids the parent field validation issue
                    foreach ($allFiles as $key => $file) {
                        if (preg_match('/^supporting_documents\.(\d+)$/', $key)) {
                            // Manually validate each file
                            if ($file && $file->isValid()) {
                                $allowedMimes = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
                                $maxSize = 5120; // 5MB in KB
                                
                                if (!in_array(strtolower($file->getClientOriginalExtension()), $allowedMimes) && 
                                    !in_array($file->getMimeType(), ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'])) {
                                    return response()->json([
                                        'success' => false,
                                        'errors' => [
                                            $key => ['The file must be a file of type: pdf, doc, docx, jpg, jpeg, png.']
                                        ]
                                    ], 422);
                                }
                                
                                if ($file->getSize() > $maxSize * 1024) {
                                    return response()->json([
                                        'success' => false,
                                        'errors' => [
                                            $key => ['The file may not be greater than ' . $maxSize . ' kilobytes.']
                                        ]
                                    ], 422);
                                }
                            }
                        }
                    }
                    // Don't add any validation rules for supporting_documents when array format
                } else {
                    // Single file format (backward compatibility)
                    $rules['supporting_documents'] = 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:5120';
                }
            }
            
            // Build validation data - completely exclude supporting_documents when array format
            // Use except() to ensure it's not included at all
            if ($hasSupportingDocsArray) {
                // For array format, exclude supporting_documents from validation completely
                $validationData = $request->except(['supporting_documents']);
            } else {
                // For single file format, use all request data
                $validationData = $request->all();
            }
            
            // Ensure supporting_documents is not in validation data (double check)
            unset($validationData['supporting_documents']);
            
            $validator = Validator::make($validationData, $rules);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }
            
            $employeeProfile = $user->employeeProfile;

            // Get employee profile ID if available
            $employeeProfileId = $employeeProfile ? $employeeProfile->id : null;

            // Handle application form file upload (required)
            $applicationFormPath = null;
            $applicationFormName = null;
            if ($request->hasFile('application_form')) {
                $file = $request->file('application_form');
                if ($file && $file->isValid()) {
                    $applicationFormName = time() . '_application_' . $file->getClientOriginalName();
                    $applicationFormPath = $file->storeAs('benefit_claims/application_forms', $applicationFormName, 'public');
                    
                    if (!$applicationFormPath) {
                        throw new \Exception('Failed to store application form file');
                    }
                } else {
                    throw new \Exception('Application form file is not valid');
                }
            } else {
                throw new \Exception('Application form file is required');
            }

            // Handle supporting documents file upload (optional - can be multiple)
            $supportingDocsPaths = [];
            $supportingDocsNames = [];
            
            // Handle supporting documents file storage
            // Always use allFiles() to get files reliably, regardless of format
            $allFilesForStorage = $request->allFiles();
            
            foreach ($allFilesForStorage as $key => $file) {
                // Match array format: supporting_documents.0 (Laravel normalizes [0] to .0)
                if (preg_match('/^supporting_documents\.(\d+)$/', $key)) {
                    if ($file && $file->isValid()) {
                        $supportingDocsName = time() . '_' . uniqid() . '_supporting_' . $file->getClientOriginalName();
                        $supportingDocsPath = $file->storeAs('benefit_claims/supporting_docs', $supportingDocsName, 'public');
                        
                        if (!$supportingDocsPath) {
                            throw new \Exception("Failed to store supporting document: {$file->getClientOriginalName()}");
                        }
                        
                        $supportingDocsPaths[] = $supportingDocsPath;
                        $supportingDocsNames[] = $supportingDocsName;
                    }
                } elseif ($key === 'supporting_documents' && !is_array($file)) {
                    // Single file format (backward compatibility) - only if it's not an array
                    if ($file && $file->isValid()) {
                        $supportingDocsName = time() . '_supporting_' . $file->getClientOriginalName();
                        $supportingDocsPath = $file->storeAs('benefit_claims/supporting_docs', $supportingDocsName, 'public');
                        
                        if (!$supportingDocsPath) {
                            throw new \Exception("Failed to store supporting document: {$file->getClientOriginalName()}");
                        }
                        
                        $supportingDocsPaths[] = $supportingDocsPath;
                        $supportingDocsNames[] = $supportingDocsName;
                    }
                }
            }

            // Calculate amount from application form if needed, or set to 0 for now
            // The amount can be extracted from the form later or set manually by HR
            $amount = 0; // Default to 0, can be updated by HR during review

            // Store documents: application form is primary, supporting docs stored as JSON array
            // Combine application form with supporting docs for storage
            $allDocumentPaths = [];
            $allDocumentNames = [];
            
            // Add application form first
            if ($applicationFormPath) {
                $allDocumentPaths[] = $applicationFormPath;
                $allDocumentNames[] = $applicationFormName;
            }
            
            // Add supporting documents
            if (!empty($supportingDocsPaths)) {
                $allDocumentPaths = array_merge($allDocumentPaths, $supportingDocsPaths);
                $allDocumentNames = array_merge($allDocumentNames, $supportingDocsNames);
            }
            
            // Store as JSON if multiple documents, or as string if single
            $documentsPathJson = count($allDocumentPaths) > 1 ? json_encode($allDocumentPaths) : ($allDocumentPaths[0] ?? null);
            $documentsNameJson = count($allDocumentNames) > 1 ? json_encode($allDocumentNames) : ($allDocumentNames[0] ?? null);

            $benefitClaim = BenefitClaim::create([
                'user_id' => $user->id,
                'employee_profile_id' => $employeeProfileId,
                'benefit_type' => $request->benefit_type,
                'claim_type' => $request->claim_type,
                'amount' => $amount,
                'description' => $request->description,
                'supporting_documents_path' => $documentsPathJson,
                'supporting_documents_name' => $documentsNameJson,
                'status' => 'submitted',
            ]);

            $benefitClaim->load(['user', 'employeeProfile']);

            // Send notification to employee when claim is submitted
            if ($benefitClaim->user) {
                $benefitClaim->user->notify(new BenefitClaimStatusChanged($benefitClaim));
            }

            return response()->json([
                'success' => true,
                'message' => 'Benefit claim request filed successfully',
                'data' => $benefitClaim
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error filing benefit claim: ' . $e->getMessage());
            Log::error('Error trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to file benefit claim: ' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    /**
     * Get a specific benefit claim
     */
    public function show($id)
    {
        try {
            $claim = BenefitClaim::with(['user.employeeProfile', 'employeeProfile', 'reviewedBy'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $claim
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Benefit claim not found'
            ], 404);
        }
    }

    /**
     * Approve a benefit claim (for HR Assistant)
     */
    public function approve($id)
    {
        try {
            $claim = BenefitClaim::findOrFail($id);

            if ($claim->status === 'rejected' || $claim->status === 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'This claim has already been processed'
                ], 400);
            }

            $claim->update([
                'status' => 'approved_by_hr',
                'reviewed_by' => Auth::id(),
                'reviewed_at' => now(),
            ]);

            $claim->load(['user.employeeProfile', 'employeeProfile', 'reviewedBy']);

            // Send notification to employee
            if ($claim->user) {
                $claim->user->notify(new BenefitClaimStatusChanged($claim));
            }

            return response()->json([
                'success' => true,
                'message' => 'Benefit claim approved successfully',
                'data' => $claim
            ]);
        } catch (\Exception $e) {
            Log::error('Error approving benefit claim: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve benefit claim'
            ], 500);
        }
    }

    /**
     * Reject a benefit claim (for HR Assistant)
     */
    public function reject(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'rejection_reason' => 'required|string|min:10',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $claim = BenefitClaim::findOrFail($id);

            if ($claim->status === 'rejected' || $claim->status === 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'This claim has already been processed'
                ], 400);
            }

            $claim->update([
                'status' => 'rejected',
                'rejection_reason' => $request->rejection_reason,
                'reviewed_by' => Auth::id(),
                'reviewed_at' => now(),
            ]);

            $claim->load(['user.employeeProfile', 'employeeProfile', 'reviewedBy']);

            // Send notification to employee
            if ($claim->user) {
                $claim->user->notify(new BenefitClaimStatusChanged($claim));
            }

            return response()->json([
                'success' => true,
                'message' => 'Benefit claim rejected successfully',
                'data' => $claim
            ]);
        } catch (\Exception $e) {
            Log::error('Error rejecting benefit claim: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject benefit claim'
            ], 500);
        }
    }

    /**
     * Download supporting document
     */
    public function downloadDocument($id)
    {
        try {
            $claim = BenefitClaim::findOrFail($id);
            
            if (!$claim->supporting_documents_path) {
                return response()->json([
                    'success' => false,
                    'message' => 'No supporting document available'
                ], 404);
            }

            // Check if user has permission (employee who filed it or HR)
            $user = Auth::user();
            if ($claim->user_id !== $user->id && !in_array($user->role->name ?? '', ['HR Assistant', 'HR Staff', 'HR Admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            if (!Storage::disk('public')->exists($claim->supporting_documents_path)) {
                return response()->json([
                    'success' => false,
                    'message' => 'File not found'
                ], 404);
            }

            return Storage::disk('public')->download(
                $claim->supporting_documents_path,
                $claim->supporting_documents_name ?? 'document.pdf'
            );
        } catch (\Exception $e) {
            Log::error('Error downloading benefit claim document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to download document'
            ], 500);
        }
    }

    /**
     * Terminate employee benefit enrollment (for HR Assistant)
     */
    public function terminateEnrollment($employeeId)
    {
        try {
            $employeeProfile = EmployeeProfile::findOrFail($employeeId);

            // Clear benefit numbers (or set a flag to indicate termination)
            $employeeProfile->update([
                'sss' => null,
                'philhealth' => null,
                'pagibig' => null,
                // You might want to add a benefits_status field to track this
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Employee benefit enrollment terminated successfully',
                'data' => $employeeProfile
            ]);
        } catch (\Exception $e) {
            Log::error('Error terminating benefit enrollment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to terminate benefit enrollment'
            ], 500);
        }
    }

    /**
     * Generate benefit contribution report (for HR Assistant)
     */
    public function generateContributionReport(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'benefit_type' => 'nullable|in:sss,philhealth,pagibig',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            // Get payroll records where the period overlaps with the requested date range
            // A period overlaps if: period_start <= end_date AND period_end >= start_date
            $payrolls = \App\Models\Payroll::where('period_start', '<=', $request->end_date)
                ->where('period_end', '>=', $request->start_date)
                ->with(['employee'])
                ->get();

            $report = [
                'period' => [
                    'start' => $request->start_date,
                    'end' => $request->end_date,
                ],
                'summary' => [
                    'sss' => 0,
                    'philhealth' => 0,
                    'pagibig' => 0,
                ],
                'details' => []
            ];

            foreach ($payrolls as $payroll) {
                $sssAmount = floatval($payroll->sss_deduction ?? 0);
                $philhealthAmount = floatval($payroll->philhealth_deduction ?? 0);
                $pagibigAmount = floatval($payroll->pagibig_deduction ?? 0);

                // Filter by benefit type if specified
                if ($request->benefit_type) {
                    if ($request->benefit_type === 'sss' && $sssAmount == 0) continue;
                    if ($request->benefit_type === 'philhealth' && $philhealthAmount == 0) continue;
                    if ($request->benefit_type === 'pagibig' && $pagibigAmount == 0) continue;
                }

                // Skip if employee is null
                if (!$payroll->employee) {
                    continue;
                }

                $report['summary']['sss'] += $sssAmount;
                $report['summary']['philhealth'] += $philhealthAmount;
                $report['summary']['pagibig'] += $pagibigAmount;

                $report['details'][] = [
                    'employee_id' => $payroll->employee->employee_id ?? 'N/A',
                    'employee_name' => trim(($payroll->employee->first_name ?? '') . ' ' . ($payroll->employee->last_name ?? '')),
                    'period_start' => $payroll->period_start ? $payroll->period_start->format('Y-m-d') : null,
                    'period_end' => $payroll->period_end ? $payroll->period_end->format('Y-m-d') : null,
                    'sss' => $sssAmount,
                    'philhealth' => $philhealthAmount,
                    'pagibig' => $pagibigAmount,
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $report
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating contribution report: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate contribution report',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Update benefit claim status (for HR Assistant)
     */
    public function updateStatus(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'status' => 'required|in:submitted,under_review,approved_by_hr,for_submission_to_agency,completed,rejected',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $claim = BenefitClaim::findOrFail($id);
            $oldStatus = $claim->status;
            $newStatus = $request->status;

            // Update status
            $updateData = [
                'status' => $newStatus,
                'reviewed_by' => Auth::id(),
                'reviewed_at' => now(),
            ];

            // If status is rejected, require rejection reason
            if ($newStatus === 'rejected') {
                if (!$request->has('rejection_reason') || empty($request->rejection_reason)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Rejection reason is required when rejecting a claim'
                    ], 422);
                }
                $updateData['rejection_reason'] = $request->rejection_reason;
            } else {
                // Clear rejection reason if status is not rejected
                $updateData['rejection_reason'] = null;
            }

            $claim->update($updateData);
            $claim->load(['user.employeeProfile', 'employeeProfile', 'reviewedBy']);

            // Send notification to employee if status changed
            if ($oldStatus !== $newStatus && $claim->user) {
                $claim->user->notify(new BenefitClaimStatusChanged($claim));
            }

            return response()->json([
                'success' => true,
                'message' => 'Benefit claim status updated successfully',
                'data' => $claim
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating benefit claim status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update benefit claim status'
            ], 500);
        }
    }
}
