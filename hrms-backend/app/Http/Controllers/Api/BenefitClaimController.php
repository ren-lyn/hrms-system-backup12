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
            $supportingDocsProcessed = false; // Flag to track if we've processed via Method 1
            
            // Handle supporting documents file storage
            // Try multiple methods to get supporting documents
            // Method 1: Check if supporting_documents is an array of files
            if ($request->hasFile('supporting_documents')) {
                $supportingDocsFiles = $request->file('supporting_documents');
                
                // Handle both single file and array of files
                if (is_array($supportingDocsFiles)) {
                    foreach ($supportingDocsFiles as $index => $file) {
                        if ($file && $file->isValid()) {
                            $supportingDocsName = time() . '_' . uniqid() . '_supporting_' . $file->getClientOriginalName();
                            $supportingDocsPath = $file->storeAs('benefit_claims/supporting_docs', $supportingDocsName, 'public');
                            
                            if (!$supportingDocsPath) {
                                throw new \Exception("Failed to store supporting document: {$file->getClientOriginalName()}");
                            }
                            
                            $supportingDocsPaths[] = $supportingDocsPath;
                            $supportingDocsNames[] = $supportingDocsName;
                            
                            if (config('app.debug')) {
                                Log::info('Stored supporting document (array method)', [
                                    'index' => $index,
                                    'original_name' => $file->getClientOriginalName(),
                                    'stored_path' => $supportingDocsPath
                                ]);
                            }
                        }
                    }
                } elseif ($supportingDocsFiles && $supportingDocsFiles->isValid()) {
                    // Single file
                    $file = $supportingDocsFiles;
                    $supportingDocsName = time() . '_' . uniqid() . '_supporting_' . $file->getClientOriginalName();
                    $supportingDocsPath = $file->storeAs('benefit_claims/supporting_docs', $supportingDocsName, 'public');
                    
                    if (!$supportingDocsPath) {
                        throw new \Exception("Failed to store supporting document: {$file->getClientOriginalName()}");
                    }
                    
                    $supportingDocsPaths[] = $supportingDocsPath;
                    $supportingDocsNames[] = $supportingDocsName;
                    
                    if (config('app.debug')) {
                        Log::info('Stored supporting document (single file method)', [
                            'original_name' => $file->getClientOriginalName(),
                            'stored_path' => $supportingDocsPath
                        ]);
                    }
                }
                $supportingDocsProcessed = true; // Mark as processed
            }
            
            // Method 2: Check allFiles() for normalized array keys (supporting_documents.0, supporting_documents.1, etc.)
            $allFilesForStorage = $request->allFiles();
            
            // Log all files received for debugging
            if (config('app.debug')) {
                $fileKeysInfo = [];
                foreach ($allFilesForStorage as $key => $file) {
                    $fileKeysInfo[$key] = [
                        'type' => gettype($file),
                        'is_array' => is_array($file),
                        'is_file' => is_object($file) && method_exists($file, 'isValid'),
                    ];
                }
                
                Log::info('Files received in benefit claim submission', [
                    'all_file_keys' => array_keys($allFilesForStorage),
                    'file_keys_info' => $fileKeysInfo,
                    'has_application_form' => $request->hasFile('application_form'),
                    'has_supporting_documents' => $request->hasFile('supporting_documents'),
                    'supporting_documents_type' => $request->hasFile('supporting_documents') ? gettype($request->file('supporting_documents')) : 'none',
                    'supporting_documents_is_array' => $request->hasFile('supporting_documents') && is_array($request->file('supporting_documents')),
                ]);
            }
            
            // Method 2a: Check if supporting_documents exists as a nested array in allFiles()
            // Only process if we haven't already processed via Method 1
            if (!$supportingDocsProcessed && isset($allFilesForStorage['supporting_documents']) && is_array($allFilesForStorage['supporting_documents'])) {
                foreach ($allFilesForStorage['supporting_documents'] as $index => $file) {
                    if ($file && is_object($file) && method_exists($file, 'isValid') && $file->isValid()) {
                        $supportingDocsName = time() . '_' . uniqid() . '_supporting_' . $file->getClientOriginalName();
                        $supportingDocsPath = $file->storeAs('benefit_claims/supporting_docs', $supportingDocsName, 'public');
                        
                        if (!$supportingDocsPath) {
                            throw new \Exception("Failed to store supporting document: {$file->getClientOriginalName()}");
                        }
                        
                        $supportingDocsPaths[] = $supportingDocsPath;
                        $supportingDocsNames[] = $supportingDocsName;
                        
                        if (config('app.debug')) {
                            Log::info('Stored supporting document (nested array method)', [
                                'index' => $index,
                                'original_name' => $file->getClientOriginalName(),
                                'stored_path' => $supportingDocsPath
                            ]);
                        }
                    }
                }
            }
            
            // Method 2b: Process files from allFiles() that might be in normalized format (supporting_documents.0, supporting_documents.1, etc.)
            foreach ($allFilesForStorage as $key => $file) {
                // Skip application_form as it's handled separately
                if ($key === 'application_form') {
                    continue;
                }
                
                // Skip if we already processed this via Method 1 or Method 2a
                if ($key === 'supporting_documents') {
                    continue;
                }
                
                // Match array format: supporting_documents.0 (Laravel normalizes [0] to .0)
                // Also check for supporting_documents[0] format that might not be normalized
                $isSupportingDoc = false;
                
                if (preg_match('/^supporting_documents\.(\d+)$/', $key)) {
                    // Array format: supporting_documents.0
                    $isSupportingDoc = true;
                } elseif (preg_match('/^supporting_documents\[(\d+)\]$/', $key)) {
                    // Array format: supporting_documents[0] (if not normalized)
                    $isSupportingDoc = true;
                }
                
                if ($isSupportingDoc && $file && is_object($file) && method_exists($file, 'isValid') && $file->isValid()) {
                    $supportingDocsName = time() . '_' . uniqid() . '_supporting_' . $file->getClientOriginalName();
                    $supportingDocsPath = $file->storeAs('benefit_claims/supporting_docs', $supportingDocsName, 'public');
                    
                    if (!$supportingDocsPath) {
                        throw new \Exception("Failed to store supporting document: {$file->getClientOriginalName()}");
                    }
                    
                    $supportingDocsPaths[] = $supportingDocsPath;
                    $supportingDocsNames[] = $supportingDocsName;
                    
                    if (config('app.debug')) {
                        Log::info('Stored supporting document (normalized key method)', [
                            'key' => $key,
                            'original_name' => $file->getClientOriginalName(),
                            'stored_path' => $supportingDocsPath
                        ]);
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

            // Log document storage for debugging
            if (config('app.debug')) {
                Log::info('Storing benefit claim documents', [
                    'total_documents' => count($allDocumentPaths),
                    'application_form' => $applicationFormPath ? 'yes' : 'no',
                    'application_form_path' => $applicationFormPath,
                    'supporting_docs_count' => count($supportingDocsPaths),
                    'supporting_docs_paths' => $supportingDocsPaths,
                    'all_document_paths' => $allDocumentPaths,
                    'all_document_names' => $allDocumentNames,
                    'is_json' => count($allDocumentPaths) > 1,
                    'documents_path_json' => $documentsPathJson,
                    'documents_name_json' => $documentsNameJson
                ]);
            }

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
     * Get all documents for a benefit claim
     */
    public function getDocuments($id)
    {
        try {
            $claim = BenefitClaim::findOrFail($id);
            
            // Check if user has permission (employee who filed it or HR)
            $user = Auth::user();
            if ($claim->user_id !== $user->id && !in_array($user->role->name ?? '', ['HR Assistant', 'HR Staff', 'HR Admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }
            
            if (!$claim->supporting_documents_path) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => 'No documents found in database'
                ]);
            }
            
            // Parse documents - handle both JSON array and single string
            $documentsPath = $claim->supporting_documents_path;
            $documentsName = $claim->supporting_documents_name;
            
            // Log raw database values for debugging
            if (config('app.debug')) {
                Log::info('Raw database values for benefit claim documents', [
                    'claim_id' => $id,
                    'supporting_documents_path_raw' => $documentsPath,
                    'supporting_documents_name_raw' => $documentsName,
                    'path_length' => strlen($documentsPath ?? ''),
                    'name_length' => strlen($documentsName ?? ''),
                    'is_json_path' => json_decode($documentsPath, true) !== null,
                    'is_json_name' => json_decode($documentsName, true) !== null
                ]);
            }
            
            // Decode JSON, handling escaped characters
            $decoded = json_decode($documentsPath, true);
            $jsonError = json_last_error();
            
            // If JSON decode fails, try unescaping first (in case of double-encoded JSON)
            if ($jsonError !== JSON_ERROR_NONE) {
                $unescaped = stripslashes($documentsPath);
                $decoded = json_decode($unescaped, true);
                $jsonError = json_last_error();
            }
            
            $isJsonArray = ($jsonError === JSON_ERROR_NONE && is_array($decoded));
            
            // Normalize paths in decoded array (remove escaped backslashes)
            if ($isJsonArray) {
                $decoded = array_map(function($path) {
                    // Replace escaped backslashes with forward slashes
                    return str_replace(['\\/', '\\\\'], '/', $path);
                }, $decoded);
            }
            
            // Log for debugging
            if (config('app.debug')) {
                Log::info('Getting benefit claim documents', [
                    'claim_id' => $id,
                    'is_json_array' => $isJsonArray,
                    'json_error' => $jsonError,
                    'json_error_msg' => json_last_error_msg(),
                    'documents_path' => $documentsPath,
                    'documents_name' => $documentsName,
                    'decoded_paths' => $isJsonArray ? $decoded : [$documentsPath],
                    'decoded_count' => $isJsonArray ? count($decoded) : 1,
                    'decoded_paths_detail' => $isJsonArray ? array_map(function($p) {
                        return [
                            'path' => $p,
                            'normalized' => ltrim($p, '/'),
                            'exists' => Storage::disk('public')->exists($p) || Storage::disk('public')->exists(ltrim($p, '/'))
                        ];
                    }, $decoded) : []
                ]);
            }
            
            $documents = [];
            
            if ($isJsonArray) {
                // Multiple documents
                $paths = $decoded;
                $names = json_decode($documentsName, true);
                
                if (!is_array($names)) {
                    $names = [];
                }
                
                foreach ($paths as $index => $path) {
                    // Normalize path (remove leading slashes if any)
                    $normalizedPath = ltrim($path, '/');
                    
                    // Try multiple path variations to find the file
                    $possiblePaths = [
                        $path,
                        $normalizedPath,
                        ltrim(str_replace('storage/', '', $path), '/'),
                        ltrim(str_replace('public/', '', $path), '/'),
                    ];
                    
                    $fileExists = false;
                    $actualPath = $path;
                    
                    foreach ($possiblePaths as $tryPath) {
                        if (Storage::disk('public')->exists($tryPath)) {
                            $fileExists = true;
                            $actualPath = $tryPath;
                            break;
                        }
                    }
                    
                    if ($fileExists) {
                        $fileName = $names[$index] ?? basename($actualPath);
                        
                        // Determine document type based on actual path or filename
                        // Priority: completion_evidence > application_forms > supporting_docs
                        // Use actualPath (the path that exists) for detection
                        $isCompletionEvidence = strpos($actualPath, 'completion_evidence') !== false || 
                                                strpos($fileName, 'completion_evidence') !== false;
                        $isApplicationForm = strpos($actualPath, 'application_forms') !== false || 
                                            (strpos($fileName, 'application') !== false && !$isCompletionEvidence);
                        $isSupportingDoc = strpos($actualPath, 'supporting_docs') !== false && !$isCompletionEvidence && !$isApplicationForm;
                        
                        $source = 'employee'; // Default
                        $type = 'unknown';
                        $label = 'Document';
                        
                        if ($isCompletionEvidence) {
                            $source = 'hr_assistant';
                            $type = 'completion_evidence';
                            $label = 'HR Assistant - Evidence of Completion';
                        } elseif ($isApplicationForm) {
                            $source = 'employee';
                            $type = 'application_form';
                            $label = 'Employee - Application Form';
                        } elseif ($isSupportingDoc) {
                            $source = 'employee';
                            $type = 'supporting_document';
                            $label = 'Employee - Supporting Document';
                        } else {
                            // Fallback: try to determine from filename patterns
                            if (strpos($fileName, 'application') !== false) {
                                $source = 'employee';
                                $type = 'application_form';
                                $label = 'Employee - Application Form';
                            } elseif (strpos($fileName, 'supporting') !== false) {
                                $source = 'employee';
                                $type = 'supporting_document';
                                $label = 'Employee - Supporting Document';
                            } else {
                                // Default to supporting document if we can't determine
                                $source = 'employee';
                                $type = 'supporting_document';
                                $label = 'Employee - Supporting Document';
                            }
                        }
                        
                        $documents[] = [
                            'index' => $index,
                            'path' => $actualPath,
                            'name' => $fileName,
                            'url' => asset('storage/' . $actualPath),
                            'preview_url' => url("/api/benefit-claims/{$id}/preview?index={$index}"),
                            'download_url' => url("/api/benefit-claims/{$id}/document?index={$index}"),
                            'source' => $source,
                            'type' => $type,
                            'label' => $label
                        ];
                    } else {
                        // Try to find the file with different path variations
                        $possiblePaths = [
                            $path,
                            $normalizedPath,
                            'benefit_claims/' . basename($path),
                            ltrim(str_replace('storage/', '', $path), '/'),
                        ];
                        
                        $foundPath = null;
                        foreach ($possiblePaths as $tryPath) {
                            if (Storage::disk('public')->exists($tryPath)) {
                                $foundPath = $tryPath;
                                $fileExists = true;
                                break;
                            }
                        }
                        
                        if ($fileExists && $foundPath) {
                            // File found with alternative path
                            $fileName = $names[$index] ?? basename($foundPath);
                            
                            // Determine document type
                            $isCompletionEvidence = strpos($foundPath, 'completion_evidence') !== false || 
                                                    strpos($fileName, 'completion_evidence') !== false;
                            $isApplicationForm = strpos($foundPath, 'application_forms') !== false || 
                                                (strpos($fileName, 'application') !== false && !$isCompletionEvidence);
                            $isSupportingDoc = strpos($foundPath, 'supporting_docs') !== false && !$isCompletionEvidence && !$isApplicationForm;
                            
                            $source = 'employee';
                            $type = 'unknown';
                            $label = 'Document';
                            
                            if ($isCompletionEvidence) {
                                $source = 'hr_assistant';
                                $type = 'completion_evidence';
                                $label = 'HR Assistant - Evidence of Completion';
                            } elseif ($isApplicationForm) {
                                $source = 'employee';
                                $type = 'application_form';
                                $label = 'Employee - Application Form';
                            } elseif ($isSupportingDoc || strpos($fileName, 'supporting') !== false) {
                                $source = 'employee';
                                $type = 'supporting_document';
                                $label = 'Employee - Supporting Document';
                            } else {
                                $source = 'employee';
                                $type = 'supporting_document';
                                $label = 'Employee - Supporting Document';
                            }
                            
                            $documents[] = [
                                'index' => $index,
                                'path' => $foundPath,
                                'name' => $fileName,
                                'url' => asset('storage/' . $foundPath),
                                'preview_url' => url("/api/benefit-claims/{$id}/preview?index={$index}"),
                                'download_url' => url("/api/benefit-claims/{$id}/document?index={$index}"),
                                'source' => $source,
                                'type' => $type,
                                'label' => $label
                            ];
                            
                            Log::info('Found document with alternative path', [
                                'claim_id' => $id,
                                'original_path' => $path,
                                'found_path' => $foundPath
                            ]);
                        } else {
                            // Log missing files for debugging
                            Log::warning('Benefit claim document file not found', [
                                'claim_id' => $id,
                                'index' => $index,
                                'path' => $path,
                                'normalized_path' => $normalizedPath,
                                'file_exists' => $fileExists,
                                'storage_path' => Storage::disk('public')->path($path),
                                'all_paths_tried' => $possiblePaths
                            ]);
                        }
                    }
                }
                
                // Log final document count for debugging
                if (config('app.debug')) {
                    $missingFiles = [];
                    foreach ($paths as $idx => $p) {
                        $found = false;
                        foreach ($documents as $doc) {
                            if ($doc['index'] === $idx || basename($doc['path']) === basename($p)) {
                                $found = true;
                                break;
                            }
                        }
                        if (!$found) {
                            $missingFiles[] = [
                                'index' => $idx,
                                'path' => $p,
                                'name' => $names[$idx] ?? basename($p),
                                'exists' => Storage::disk('public')->exists($p) || Storage::disk('public')->exists(ltrim($p, '/'))
                            ];
                        }
                    }
                    
                    Log::info('Retrieved benefit claim documents', [
                        'claim_id' => $id,
                        'total_paths_in_db' => count($paths),
                        'documents_found' => count($documents),
                        'missing_files' => $missingFiles,
                        'document_types' => array_column($documents, 'type'),
                        'all_paths' => $paths
                    ]);
                }
            } else {
                // Single document
                if (Storage::disk('public')->exists($documentsPath)) {
                    $fileName = $documentsName ?? basename($documentsPath);
                    
                    // Determine document type
                    $isCompletionEvidence = strpos($documentsPath, 'completion_evidence') !== false || 
                                            strpos($fileName, 'completion_evidence') !== false;
                    $isApplicationForm = strpos($documentsPath, 'application_forms') !== false || 
                                        (strpos($fileName, 'application') !== false && !$isCompletionEvidence);
                    $isSupportingDoc = strpos($documentsPath, 'supporting_docs') !== false && !$isCompletionEvidence && !$isApplicationForm;
                    
                    $source = 'employee';
                    $type = 'unknown';
                    $label = 'Document';
                    
                    if ($isCompletionEvidence) {
                        $source = 'hr_assistant';
                        $type = 'completion_evidence';
                        $label = 'HR Assistant - Evidence of Completion';
                    } elseif ($isApplicationForm) {
                        $source = 'employee';
                        $type = 'application_form';
                        $label = 'Employee - Application Form';
                    } elseif ($isSupportingDoc) {
                        $source = 'employee';
                        $type = 'supporting_document';
                        $label = 'Employee - Supporting Document';
                    } else {
                        // Fallback
                        if (strpos($fileName, 'application') !== false) {
                            $type = 'application_form';
                            $label = 'Employee - Application Form';
                        } elseif (strpos($fileName, 'supporting') !== false) {
                            $type = 'supporting_document';
                            $label = 'Employee - Supporting Document';
                        } else {
                            $type = 'supporting_document';
                            $label = 'Employee - Document';
                        }
                    }
                    
                    $documents[] = [
                        'index' => 0,
                        'path' => $documentsPath,
                        'name' => $fileName,
                        'url' => asset('storage/' . $documentsPath),
                        'preview_url' => url("/api/benefit-claims/{$id}/preview?index=0"),
                        'download_url' => url("/api/benefit-claims/{$id}/document?index=0"),
                        'source' => $source,
                        'type' => $type,
                        'label' => $label
                    ];
                }
            }
            
            // Sort documents: application form first, then supporting docs, then completion evidence
            usort($documents, function($a, $b) {
                $order = ['application_form' => 1, 'supporting_document' => 2, 'completion_evidence' => 3, 'unknown' => 4];
                $orderA = $order[$a['type']] ?? 4;
                $orderB = $order[$b['type']] ?? 4;
                if ($orderA === $orderB) {
                    return $a['index'] <=> $b['index'];
                }
                return $orderA <=> $orderB;
            });
            
            // Re-index after sorting
            $documents = array_values($documents);
            foreach ($documents as $idx => &$doc) {
                $doc['index'] = $idx;
                // Update preview and download URLs to use new index
                $doc['preview_url'] = url("/api/benefit-claims/{$id}/preview?index={$idx}");
                $doc['download_url'] = url("/api/benefit-claims/{$id}/document?index={$idx}");
            }
            unset($doc);
            
            // Count documents by type for summary
            $summary = [
                'application_form' => 0,
                'supporting_document' => 0,
                'completion_evidence' => 0,
                'unknown' => 0
            ];
            
            foreach ($documents as $doc) {
                $type = $doc['type'] ?? 'unknown';
                if (isset($summary[$type])) {
                    $summary[$type]++;
                } else {
                    $summary['unknown']++;
                }
            }
            
            // Build debug info showing what should be there vs what was found
            $debugInfo = null;
            if (config('app.debug')) {
                $expectedDocs = [];
                if ($isJsonArray) {
                    foreach ($decoded as $idx => $p) {
                        $expectedDocs[] = [
                            'index' => $idx,
                            'path' => $p,
                            'name' => (is_array($names) && isset($names[$idx])) ? $names[$idx] : basename($p),
                            'exists' => Storage::disk('public')->exists($p) || Storage::disk('public')->exists(ltrim($p, '/')),
                            'type_expected' => strpos($p, 'application_forms') !== false ? 'application_form' : 
                                             (strpos($p, 'supporting_docs') !== false ? 'supporting_document' : 
                                             (strpos($p, 'completion_evidence') !== false ? 'completion_evidence' : 'unknown'))
                        ];
                    }
                } else {
                    $expectedDocs[] = [
                        'index' => 0,
                        'path' => $documentsPath,
                        'name' => $documentsName ?? basename($documentsPath),
                        'exists' => Storage::disk('public')->exists($documentsPath) || Storage::disk('public')->exists(ltrim($documentsPath, '/')),
                        'type_expected' => strpos($documentsPath, 'application_forms') !== false ? 'application_form' : 
                                         (strpos($documentsPath, 'supporting_docs') !== false ? 'supporting_document' : 
                                         (strpos($documentsPath, 'completion_evidence') !== false ? 'completion_evidence' : 'unknown'))
                    ];
                }
                
                $debugInfo = [
                    'total_paths_in_db' => $isJsonArray ? count($decoded) : 1,
                    'documents_found' => count($documents),
                    'expected_documents' => $expectedDocs,
                    'found_document_types' => array_column($documents, 'type'),
                    'found_document_labels' => array_column($documents, 'label'),
                    'raw_paths' => $isJsonArray ? $decoded : [$documentsPath],
                    'raw_names' => $isJsonArray ? (is_array($names) ? $names : []) : [$documentsName]
                ];
            }
            
            return response()->json([
                'success' => true,
                'data' => $documents,
                'count' => count($documents),
                'summary' => $summary,
                'debug' => $debugInfo
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting benefit claim documents: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get documents'
            ], 500);
        }
    }

    /**
     * Download supporting document
     */
    public function downloadDocument(Request $request, $id)
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

            // Handle both single file path and JSON array of paths
            $documentsPath = $claim->supporting_documents_path;
            $documentsName = $claim->supporting_documents_name;
            
            // Try to decode as JSON (for multiple documents)
            $decoded = json_decode($documentsPath, true);
            $isJsonArray = (json_last_error() === JSON_ERROR_NONE && is_array($decoded));
            
            if ($isJsonArray) {
                // Multiple documents - get the first one or specified index
                $documentIndex = $request->query('index', 0);
                $documentPaths = $decoded;
                
                if (!isset($documentPaths[$documentIndex])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Document index not found'
                    ], 404);
                }
                
                $filePath = $documentPaths[$documentIndex];
                
                // Get corresponding name
                $documentNames = json_decode($documentsName, true);
                $fileName = (is_array($documentNames) && isset($documentNames[$documentIndex])) 
                    ? $documentNames[$documentIndex] 
                    : 'document.pdf';
            } else {
                // Single file path
                $filePath = $documentsPath;
                $fileName = $documentsName ?? 'document.pdf';
            }

            // Check if file exists - try both original and normalized paths
            $actualPath = $filePath;
            $normalizedPath = ltrim(str_replace('storage/', '', $filePath), '/');
            if (!Storage::disk('public')->exists($filePath)) {
                // Try normalized path
                if (Storage::disk('public')->exists($normalizedPath)) {
                    $actualPath = $normalizedPath;
                } else {
                    // Try other path variations
                    $possiblePaths = [
                        $normalizedPath,
                        'benefit_claims/' . basename($filePath),
                        ltrim(str_replace('storage/', '', $filePath), '/'),
                    ];
                    
                    $found = false;
                    foreach ($possiblePaths as $tryPath) {
                        if (Storage::disk('public')->exists($tryPath)) {
                            $actualPath = $tryPath;
                            $found = true;
                            break;
                        }
                    }
                    
                    if (!$found) {
                        Log::warning('Benefit claim document not found', [
                            'claim_id' => $id,
                            'file_path' => $filePath,
                            'normalized_path' => $normalizedPath,
                            'is_json' => $isJsonArray,
                            'index' => $documentIndex ?? 0,
                            'all_paths_tried' => array_merge([$filePath, $normalizedPath], $possiblePaths)
                        ]);
                        
                        return response()->json([
                            'success' => false,
                            'message' => 'File not found'
                        ], 404);
                    }
                }
            }

            return response()->download(Storage::disk('public')->path($actualPath), $fileName);
        } catch (\Exception $e) {
            Log::error('Error downloading benefit claim document: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to download document'
            ], 500);
        }
    }

    /**
     * Preview document (serve file for viewing, not downloading)
     */
    public function previewDocument(Request $request, $id)
    {
        try {
            $claim = BenefitClaim::findOrFail($id);
            
            // Check if user has permission (employee who filed it or HR)
            $user = Auth::user();
            if ($claim->user_id !== $user->id && !in_array($user->role->name ?? '', ['HR Assistant', 'HR Staff', 'HR Admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            if (!$claim->supporting_documents_path) {
                return response()->json([
                    'success' => false,
                    'message' => 'No supporting document available'
                ], 404);
            }

            // Handle both single file path and JSON array of paths
            $documentsPath = $claim->supporting_documents_path;
            $documentsName = $claim->supporting_documents_name;
            
            // Try to decode as JSON (for multiple documents)
            $decoded = json_decode($documentsPath, true);
            $isJsonArray = (json_last_error() === JSON_ERROR_NONE && is_array($decoded));
            
            if ($isJsonArray) {
                // Multiple documents - get the specified index
                $documentIndex = $request->query('index', 0);
                $documentPaths = $decoded;
                
                if (!isset($documentPaths[$documentIndex])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Document index not found'
                    ], 404);
                }
                
                $filePath = $documentPaths[$documentIndex];
            } else {
                // Single file path
                $filePath = $documentsPath;
            }

            // Check if file exists - try both original and normalized paths
            $actualPath = $filePath;
            $normalizedPath = ltrim(str_replace('storage/', '', $filePath), '/');
            
            if (!Storage::disk('public')->exists($filePath)) {
                // Try normalized path
                if (Storage::disk('public')->exists($normalizedPath)) {
                    $actualPath = $normalizedPath;
                } else {
                    // Try other path variations
                    $possiblePaths = [
                        $normalizedPath,
                        'benefit_claims/' . basename($filePath),
                        ltrim(str_replace('storage/', '', $filePath), '/'),
                    ];
                    
                    $found = false;
                    foreach ($possiblePaths as $tryPath) {
                        if (Storage::disk('public')->exists($tryPath)) {
                            $actualPath = $tryPath;
                            $found = true;
                            break;
                        }
                    }
                    
                    if (!$found) {
                        return response()->json([
                            'success' => false,
                            'message' => 'File not found'
                        ], 404);
                    }
                }
            }

            // Serve file for viewing (not downloading)
            $fullPath = Storage::disk('public')->path($actualPath);
            return response()->file($fullPath);
        } catch (\Exception $e) {
            Log::error('Error previewing benefit claim document: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to preview document'
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
            // Get status from request - POST requests parse FormData correctly
            $status = $request->input('status');
            
            // Validate status
            $validator = Validator::make($request->all(), [
                'status' => 'required|in:submitted,under_review,approved_by_hr,for_submission_to_agency,completed,rejected',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }
            
            // Get status after validation
            $status = $request->input('status');

            $claim = BenefitClaim::findOrFail($id);
            $oldStatus = $claim->status;
            $newStatus = $status;

            // Check if user is HR Assistant
            $user = Auth::user();
            $roleName = strtolower($user->role->name ?? '');
            $isHrAssistant = $roleName === 'hr assistant';

            // Initialize updateData array
            $updateData = [];
            
            // If HR Assistant is trying to set status to "completed", handle evidence upload
            if ($isHrAssistant && $newStatus === 'completed') {
                // Require completion evidence file upload
                if (!$request->hasFile('completion_evidence')) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Completion evidence file is required when marking claim as completed. Please upload evidence of completion.'
                    ], 422);
                }

                // Validate the uploaded file
                $file = $request->file('completion_evidence');
                if (!$file || !$file->isValid()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid file uploaded. Please ensure the file is valid.'
                    ], 422);
                }

                // Validate file type and size
                $allowedMimes = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
                $maxSize = 5120; // 5MB in KB
                
                $fileExtension = strtolower($file->getClientOriginalExtension());
                if (!in_array($fileExtension, $allowedMimes) && 
                    !in_array($file->getMimeType(), ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid file type. Allowed types: pdf, doc, docx, jpg, jpeg, png.'
                    ], 422);
                }
                
                if ($file->getSize() > $maxSize * 1024) {
                    return response()->json([
                        'success' => false,
                        'message' => 'File size exceeds maximum allowed size of 5MB.'
                    ], 422);
                }

                // Store completion evidence file
                $completionEvidenceName = time() . '_completion_evidence_' . $file->getClientOriginalName();
                $completionEvidencePath = $file->storeAs('benefit_claims/completion_evidence', $completionEvidenceName, 'public');
                
                if (!$completionEvidencePath) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Failed to store completion evidence file.'
                    ], 500);
                }

                // Merge completion evidence with existing documents
                $existingPaths = [];
                $existingNames = [];
                
                if ($claim->supporting_documents_path) {
                    $documentsPath = $claim->supporting_documents_path;
                    $decoded = json_decode($documentsPath, true);
                    
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        // It's a JSON array
                        $existingPaths = $decoded;
                    } else {
                        // It's a single string
                        $existingPaths = [$documentsPath];
                    }
                }
                
                if ($claim->supporting_documents_name) {
                    $documentsName = $claim->supporting_documents_name;
                    $decoded = json_decode($documentsName, true);
                    
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        // It's a JSON array
                        $existingNames = $decoded;
                    } else {
                        // It's a single string
                        $existingNames = [$documentsName];
                    }
                }

                // Add completion evidence to existing documents
                $existingPaths[] = $completionEvidencePath;
                $existingNames[] = $completionEvidenceName;

                // Store as JSON if multiple documents, or as string if single
                $allDocumentsPath = count($existingPaths) > 1 ? json_encode($existingPaths) : $existingPaths[0];
                $allDocumentsName = count($existingNames) > 1 ? json_encode($existingNames) : $existingNames[0];

                // Store merged documents in updateData to ensure they're saved
                $updateData['supporting_documents_path'] = $allDocumentsPath;
                $updateData['supporting_documents_name'] = $allDocumentsName;
                
                // Log for debugging
                if (config('app.debug')) {
                    Log::info('Merging completion evidence with existing documents', [
                        'claim_id' => $id,
                        'existing_count' => count($existingPaths) - 1,
                        'total_after_merge' => count($existingPaths),
                        'completion_evidence_path' => $completionEvidencePath
                    ]);
                }
            }

            // Update status
            $updateData['status'] = $newStatus;
            $updateData['reviewed_by'] = Auth::id();
            $updateData['reviewed_at'] = now();

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
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update benefit claim status'
            ], 500);
        }
    }
}
