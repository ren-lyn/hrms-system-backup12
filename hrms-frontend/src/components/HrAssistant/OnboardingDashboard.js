import React, { useState, useEffect, useCallback, useMemo } from "react";

import {
  Container,
  Row,
  Col,
  Button,
  Badge,
  Table,
  Card,
  Alert,
  Modal,
  Form,
} from "react-bootstrap";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  faUsers,
  faClock,
  faCheckCircle,
  faCalendarAlt,
  faFileAlt,
  faUserPlus,
  faUserTie,
  faTimesCircle,
  faInfoCircle,
  faEye,
  faEdit,
  faEllipsisV,
  faDownload,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faTimes,
  faSearch,
  faRefresh,
  faPaperclip,
  faHourglassHalf,
  faChevronDown,
  faChevronUp,
  faFilePdf,
  faDollarSign,
  faIdCard,
  faPlus,
  faTrash,
  faUpload,
  faReply,
  faCheck,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";

import axios from "axios";

const OnboardingDashboard = () => {
  const [activeTab, setActiveTab] = useState("Overview");

  const [applicants, setApplicants] = useState([]);

  const [loading, setLoading] = useState(true);

  const [selectedRecord, setSelectedRecord] = useState(null);

  const [showModal, setShowModal] = useState(false);

  const [activeDropdown, setActiveDropdown] = useState(null);

  const [showStatusModal, setShowStatusModal] = useState(false);

  const [selectedRecordForStatus, setSelectedRecordForStatus] = useState(null);

  const [showInterviewModal, setShowInterviewModal] = useState(false);

  const [showInterviewDetailsModal, setShowInterviewDetailsModal] =
    useState(false);

  const [selectedInterviewDetails, setSelectedInterviewDetails] =
    useState(null);

  const [expandedRowId, setExpandedRowId] = useState(null);

  const [selectedApplicantForInterview, setSelectedApplicantForInterview] =
    useState(null);

  const [showJobOfferModal, setShowJobOfferModal] = useState(false);

  const [onboardingSubtab, setOnboardingSubtab] = useState(
    "Document Submission"
  );

  // Onboarding management tabs

  const onboardingTabs = [
    "Document Submission",
    "Final Interview",
    "Profile Creation",
    "Benefits Enroll",
    "Orientation Schedule",
    "Start Date",
  ];

  const onboardingTabDescriptions = {
    "Final Interview":
      "Final interview scheduling and notes will be available here.",
    "Profile Creation": "Profile creation workflow is coming soon.",
    "Benefits Enroll": "Benefits enrollment workflow is coming soon.",
    "Orientation Schedule":
      "Orientation scheduling tools will be available here.",
    "Start Date": "Start date coordination will be available here.",
  };

  // Document management state

  const [documentRequirements, setDocumentRequirements] = useState([]);

  const [documentSubmissions, setDocumentSubmissions] = useState([]);

  const [followUpRequests, setFollowUpRequests] = useState([]);

  const [loadingFollowUpRequests, setLoadingFollowUpRequests] = useState(false);

  const [followUpRequestsError, setFollowUpRequestsError] = useState("");

  const [showFollowUpModal, setShowFollowUpModal] = useState(false);

  const [selectedFollowUpRequest, setSelectedFollowUpRequest] = useState(null);

  const [followUpActionType, setFollowUpActionType] = useState(null);

  const [followUpActionForm, setFollowUpActionForm] = useState({
    extensionDays: 3,

    hrResponse: "",
  });

  const [followUpActionLoading, setFollowUpActionLoading] = useState(false);

  const [documentFilter, setDocumentFilter] = useState("All");

  const [documentSearchTerm, setDocumentSearchTerm] = useState("");

  const [applicantsDocumentStatus, setApplicantsDocumentStatus] = useState({});

  const [showDocumentModal, setShowDocumentModal] = useState(false);

  const [selectedApplicationForDocs, setSelectedApplicationForDocs] =
    useState(null);

  const [documentModalTab, setDocumentModalTab] = useState(
    "Applicant Identification"
  );

  const documentModalTabs = useMemo(
    () => [
      "Applicant Identification",

      "Government & Tax Documents",

      "Medical Documents",

      "Additional Document",

      "Follow-Up Requests",
    ],
    []
  );

  const applicantIdentificationDocs = useMemo(
    () => [
      {
        key: "government-id",

        title: "Government ID",

        description:
          "Valid Government ID – Passport, Driver's License, UMID, or National ID",

        keywords: [
          "government id",
          "passport",
          "driver",
          "umid",
          "national id",
        ],

        documentKey: "governmentId",
      },

      {
        key: "birth-certificate",

        title: "Birth Certificate (PSA)",

        description:
          "Proof of age and identity issued by the Philippine Statistics Authority",

        keywords: ["birth certificate", "psa"],

        documentKey: "birthCertificate",
      },

      {
        key: "resume-cv",

        title: "Resume / Curriculum Vitae",

        description:
          "Updated resume outlining education, work history, and skills",

        keywords: ["resume", "curriculum vitae", "cv"],

        documentKey: "resume",
      },

      {
        key: "diploma-tor",

        title: "Diploma / Transcript of Records (TOR)",

        description: "Proof of educational attainment from your latest degree",

        keywords: ["diploma", "transcript", "tor"],

        documentKey: "diploma",
      },

      {
        key: "id-photo",

        title: "2x2 or Passport-size Photo",

        description: "Professional photo for company ID and personnel records",

        keywords: ["2x2", "passport-size", "photo"],

        documentKey: "photo",
      },

      {
        key: "employment-cert",

        title: "Certificate of Employment / Recommendation Letters",

        description: "Proof of past work experience or professional references",

        keywords: [
          "certificate of employment",
          "recommendation",
          "reference letter",
        ],

        documentKey: "employmentCertificate",
      },

      {
        key: "nbi-clearance",

        title: "NBI or Police Clearance",

        description: "Certification that confirms no criminal record",

        keywords: ["nbi", "police clearance"],

        documentKey: "nbiClearance",
      },

      {
        key: "barangay-clearance",

        title: "Barangay Clearance",

        description:
          "Proof of good moral character and residency from your barangay",

        keywords: ["barangay clearance"],

        documentKey: "barangayClearance",
      },
    ],
    []
  );

  const governmentTaxDocs = useMemo(
    () => [
      {
        key: "sss-document",

        title: "SSS Document Submission",

        description:
          "Provide a copy of your SSS E-1 form or latest SSS contribution statement.",

        keywords: ["sss", "social security"],

        documentKey: "sssDocument",
      },

      {
        key: "philhealth-document",

        title: "PhilHealth Document Submission",

        description:
          "Submit your PhilHealth Member Data Record (MDR) or PhilHealth ID.",

        keywords: ["philhealth"],

        documentKey: "philhealthDocument",
      },

      {
        key: "pagibig-document",

        title: "Pag-IBIG MID Submission Form",

        description:
          "Upload your Pag-IBIG Member's Data Form (MDF) or MID card showing your HDMF number.",

        keywords: ["pag-ibig", "pagibig", "hdmf"],

        documentKey: "pagibigDocument",
      },

      {
        key: "tin-document",

        title: "TIN Submission Form",

        description:
          "Provide your BIR Form 1902/1905 or any document showing your Tax Identification Number.",

        keywords: ["tin", "tax identification", "bir"],

        documentKey: "tinDocument",
      },
    ],
    []
  );

  const medicalDocs = useMemo(
    () => [
      {
        key: "medical-certificate",

        title: "Medical Certificate / Fit-to-Work Clearance",

        description:
          "Issued by a licensed doctor or accredited clinic (Received from applicant)",

        keywords: [
          "medical certificate",
          "fit-to-work",
          "fit to work",
          "medical clearance",
        ],

        documentKey: "medicalCertificate",
      },

      {
        key: "vaccination-records",

        title: "Vaccination Records",

        description:
          "If required by the company or job role (Received from applicant)",

        keywords: [
          "vaccination",
          "immunization",
          "vaccine card",
          "vaccine records",
        ],

        documentKey: "vaccinationRecords",
      },
    ],
    []
  );

  const applyDocumentOverview = useCallback((overview) => {
    if (!overview) {
      return null;
    }

    const documents = Array.isArray(overview.documents)
      ? overview.documents
      : [];

    const requirements = documents.map((doc) => ({
      id: doc.requirement_id,

      document_key: doc.document_key,

      document_name: doc.document_name,

      description: doc.description,

      is_required: doc.is_required,

      file_format: doc.file_format,

      max_file_size_mb: doc.max_file_size_mb,

      order: doc.order,

      status: doc.status,

      status_label: doc.status_label,

      status_badge: doc.status_badge,

      status_description: doc.status_description,

      submission_window: doc.submission_window || null,

      follow_up: doc.follow_up || null,
    }));

    const submissions = documents

      .map((doc) => {
        if (!doc.submission) return null;

        return {
          ...doc.submission,

          document_requirement_id:
            doc.submission.document_requirement_id ?? doc.requirement_id,

          document_key: doc.document_key,

          document_type:
            doc.submission.document_type ||
            doc.document_type ||
            doc.document_key,
        };
      })

      .filter(Boolean);

    setDocumentRequirements(requirements);

    setDocumentSubmissions(submissions);

    return {
      overview,

      requirements,

      submissions,
    };
  }, []);

  const formatApplicantDocDate = useCallback((value) => {
    if (!value) return null;

    try {
      return new Date(value).toLocaleString("en-PH", {
        year: "numeric",

        month: "short",

        day: "numeric",

        hour: "2-digit",

        minute: "2-digit",
      });
    } catch (error) {
      return String(value);
    }
  }, []);

  const computeApplicantDocStatus = useCallback(
    (doc) => {
      const keywords = (doc.keywords || []).map((keyword) =>
        keyword.toLowerCase()
      );

      const documentKey = doc.documentKey || null;

      let requirement = null;

      if (documentKey) {
        requirement = documentRequirements.find(
          (req) => req.document_key === documentKey
        );
      }

      if (!requirement && doc.requirementId) {
        requirement = documentRequirements.find(
          (req) => req.id === doc.requirementId
        );
      }

      if (!requirement && keywords.length > 0) {
        requirement = documentRequirements.find((req) => {
          const name = (req.document_name || "").toLowerCase();

          return keywords.some((keyword) => keyword && name.includes(keyword));
        });
      }

      const submission =
        (requirement
          ? documentSubmissions.find(
              (sub) => sub.document_requirement_id === requirement.id
            )
          : null) ||
        (documentKey
          ? documentSubmissions.find((sub) => sub.document_key === documentKey)
          : null);

      const rawStatus =
        submission?.status ||
        requirement?.status ||
        (requirement ? "not_submitted" : null);

      const normalizedStatus = (rawStatus || "").toLowerCase();

      const statusLabelFromBackend =
        submission?.status_label || requirement?.status_label || null;

      const statusDescription =
        submission?.status_description || requirement?.status_description || "";

      let statusVariant = "neutral";

      switch (normalizedStatus) {
        case "received":

        case "approved":
          statusVariant = "approved";

          break;

        case "rejected":

        case "resubmission_required":
          statusVariant = "resubmit";

          break;

        case "pending":

        case "pending_review":

        case "submitted":

        case "uploaded":

        case "under_review":
          statusVariant = "pending";

          break;

        default:
          statusVariant = requirement ? "neutral" : "neutral";

          break;
      }

      const fallbackLabels = {
        approved: "Approved",

        resubmit: "Resubmission Required",

        pending: "Pending",

        neutral: requirement
          ? requirement.is_required
            ? "Not Submitted"
            : "Optional"
          : "No File Uploaded",
      };

      const statusLabel =
        statusLabelFromBackend || fallbackLabels[statusVariant];

      const submissionStatus =
        normalizedStatus ||
        (submission ? "pending" : requirement ? "not_submitted" : "");

      const submittedAt = formatApplicantDocDate(
        submission?.submitted_at || submission?.created_at
      );

      const updatedAt = formatApplicantDocDate(
        submission?.reviewed_at || submission?.updated_at
      );

      return {
        requirement,

        submission,

        statusLabel,

        statusVariant,

        statusDescription,

        submittedAt,

        updatedAt,

        rejectionReason: submission?.rejection_reason || "",

        submissionStatus,
      };
    },
    [documentRequirements, documentSubmissions, formatApplicantDocDate]
  );

  const openSubmissionFile = useCallback(
    async (submission) => {
      if (!submission || !selectedApplicationForDocs) return;

      const token = localStorage.getItem("token");

      if (!token) {
        alert(
          "Your session has expired. Please log in again to view the file."
        );

        return;
      }

      const downloadUrl = `http://localhost:8000/api/applications/${selectedApplicationForDocs.id}/documents/submissions/${submission.id}/download`;

      try {
        const response = await axios.get(downloadUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },

          responseType: "blob",
        });

        const blob = new Blob([response.data], {
          type: response.headers["content-type"] || "application/octet-stream",
        });

        const objectUrl = window.URL.createObjectURL(blob);

        const newWindow = window.open(objectUrl, "_blank", "noopener");

        if (!newWindow) {
          const anchor = document.createElement("a");

          anchor.href = objectUrl;

          anchor.download = submission.file_name || "document";

          document.body.appendChild(anchor);

          anchor.click();

          document.body.removeChild(anchor);
        }

        setTimeout(() => {
          window.URL.revokeObjectURL(objectUrl);
        }, 30000);
      } catch (error) {
        console.error("Error opening submission file:", error);

        alert("We could not open the submitted file. Please try again.");
      }
    },
    [selectedApplicationForDocs]
  );

  const statusBadgeStyles = useMemo(
    () => ({
      approved: { backgroundColor: "#28a745", color: "#fff" },

      resubmit: { backgroundColor: "#dc3545", color: "#fff" },

      pending: { backgroundColor: "#f59f00", color: "#fff" },

      neutral: { backgroundColor: "#adb5bd", color: "#212529" },
    }),
    []
  );

  const formatDateTime = useCallback((value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString(undefined, {
      year: "numeric",

      month: "short",

      day: "numeric",

      hour: "numeric",

      minute: "2-digit",
    });
  }, []);

  const getFollowUpStatusVariant = useCallback((status) => {
    const normalized = (status || "").toString().toLowerCase();

    if (normalized === "resolved") return "success";

    if (normalized === "expired") return "secondary";

    return "warning";
  }, []);

  const additionalRequirementDocs = useMemo(() => {
    const matchedRequirementIds = new Set();

    const standardDocs = [
      ...applicantIdentificationDocs,

      ...governmentTaxDocs,

      ...(medicalDocs || []),
    ];

    standardDocs.forEach((doc) => {
      const keywords = (doc.keywords || []).map((keyword) =>
        keyword.toLowerCase()
      );

      const requirement = documentRequirements.find((req) => {
        if (doc.documentKey && req.document_key && req.document_key === doc.documentKey) {
          return true;
        }

        const name = (req.document_name || '').toLowerCase();

        return keywords.some((keyword) => keyword && name.includes(keyword));
      });

      if (requirement?.id) {
        matchedRequirementIds.add(requirement.id);
      }
    });

    return documentRequirements

      .filter((req) => !matchedRequirementIds.has(req.id) && req.document_key !== 'tinDocument')

      .map((req) => ({
        key: `custom-${req.id}`,

        title: req.document_name || "Additional Requirement",

        description: req.description || "No description provided.",

        keywords: [(req.document_name || "").toLowerCase()],

        requirementId: req.id,

        allowDelete: true,
      }));
  }, [
    applicantIdentificationDocs,
    governmentTaxDocs,
    medicalDocs,
    documentRequirements,
  ]);

  const [rejectingSubmissionId, setRejectingSubmissionId] = useState(null);

  const [rejectionReason, setRejectionReason] = useState("");

  const [reviewingDocument, setReviewingDocument] = useState(false);

  const [rejectingDocumentKey, setRejectingDocumentKey] = useState(null);

  const [approveModalData, setApproveModalData] = useState(null);

  const [newRequirement, setNewRequirement] = useState({
    document_name: "",

    description: "",

    is_required: true,

    file_format: "JPEG, JPG, PNG, PDF",

    max_file_size_mb: 5,
  });

  // Document review state

  const [jobOfferData, setJobOfferData] = useState({
    payment_schedule: "Monthly",

    work_setup: "Onsite",

    offer_validity: "7 days",

    employment_type: "Full-time",

    contact_person: "",

    contact_number: "",

    department: "",

    position: "",

    salary: "",
  });

  const [interviewData, setInterviewData] = useState({
    interview_date: "",

    interview_time: "",

    end_time: "",

    interview_type: "On-site",

    location: "",

    interviewer: "",

    notes: "",
  });

  // Batch interview functionality

  const [showBatchInterviewModal, setShowBatchInterviewModal] = useState(false);

  const [showStartOnboardingModal, setShowStartOnboardingModal] =
    useState(false);

  const [selectedApplicants, setSelectedApplicants] = useState([]);

  // Determine if an offer was already sent for a given applicant (from localStorage)

  const isOfferSent = useCallback((applicantId) => {
    try {
      const offers = JSON.parse(localStorage.getItem("jobOffers") || "[]");

      return offers.some((o) => String(o.applicant_id) === String(applicantId));
    } catch (e) {
      return false;
    }
  }, []);

  const [batchInterviewData, setBatchInterviewData] = useState({
    interview_date: "",

    interview_time: "",

    interview_type: "On-site",

    location: "",

    interviewer: "",

    notes: "",
  });

  // Fetch applicants from JobPortal applications

  const fetchApplicants = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      console.log(
        "🔍 [OnboardingDashboard] Fetching applicants with token:",
        token ? "Present" : "Missing"
      );

      const response = await axios.get(
        "http://localhost:8000/api/applications",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("📊 [OnboardingDashboard] API Response:", response.data);

      console.log(
        "📊 [OnboardingDashboard] Applications count:",
        response.data.length
      );

      // Handle both array and object responses

      const applications = Array.isArray(response.data)
        ? response.data
        : response.data.data || [];

      // Debug: Log first application structure

      if (applications.length > 0) {
        console.log(
          "🔍 [OnboardingDashboard] First application structure:",
          applications[0]
        );

        console.log(
          "🔍 [OnboardingDashboard] Applicant data:",
          applications[0].applicant
        );

        console.log(
          "🔍 [OnboardingDashboard] Job posting data:",
          applications[0].jobPosting
        );
      }

      setApplicants(applications);

      console.log(
        "✅ [OnboardingDashboard] Applications loaded:",
        applications.length
      );
    } catch (error) {
      console.error(
        "❌ [OnboardingDashboard] Error fetching applicants:",
        error
      );

      console.error(
        "❌ [OnboardingDashboard] Error details:",
        error.response?.data
      );

      setApplicants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();

    // Add debug function to window for testing

    window.debugInterviewData = () => {
      const storedInterviews = JSON.parse(
        localStorage.getItem("scheduledInterviews") || "[]"
      );

      const storedNotifications = JSON.parse(
        localStorage.getItem("applicantNotifications") || "[]"
      );

      console.log("🔍 [DEBUG] Stored Interviews:", storedInterviews);

      console.log("🔍 [DEBUG] Stored Notifications:", storedNotifications);

      console.log("🔍 [DEBUG] Current Applicants:", applicants);

      return {
        interviews: storedInterviews,

        notifications: storedNotifications,

        applicants: applicants,
      };
    };
  }, []);

  // Auto refresh disabled; use the Refresh button to reload

  // Refresh data when tab changes

  useEffect(() => {
    console.log("🔄 [OnboardingDashboard] Tab changed to:", activeTab);

    const filtered = getFilteredApplicants();

    console.log(
      "🔄 [OnboardingDashboard] Filtered applicants for",
      activeTab,
      ":",
      filtered.length
    );
  }, [activeTab, applicants]);

  // Filter applicants based on active tab

  const getFilteredApplicants = () => {
    if (activeTab === "Overview") {
      return applicants;
    }

    console.log(
      "🔍 [OnboardingDashboard] Filtering applicants for tab:",
      activeTab
    );

    console.log(
      "🔍 [OnboardingDashboard] Total applicants before filtering:",
      applicants.length
    );

    const filtered = applicants.filter((applicant) => {
      const status = applicant.status;

      console.log(
        "🔍 [OnboardingDashboard] Checking applicant status:",
        status,
        "for tab:",
        activeTab
      );

      switch (activeTab) {
        case "Pending":
          return status === "Pending";

        case "Shortlisted":
          return status === "ShortListed" || status === "Shortlisted";

        case "Interview":
          return status === "On going Interview" || status === "Interview";

        case "Offered":
          return status === "Offered";

        case "Accepted Offer":
          return status === "Accepted" || status === "Offer Accepted";

        case "Onboarding":
          return status === "Onboarding" || status === "Document Submission";

        case "Hired":
          return status === "Hired";

        case "Rejected":
          return status === "Rejected";

        default:
          return true;
      }
    });

    console.log(
      "🔍 [OnboardingDashboard] Filtered applicants count:",
      filtered.length
    );

    return filtered;
  };

  // Calculate statistics

  const calculateStats = () => {
    const stats = {
      total: applicants.length,

      pending: applicants.filter((a) => a.status === "Pending").length,

      shortlisted: applicants.filter((a) => a.status === "ShortListed").length,

      interview: applicants.filter((a) => a.status === "On going Interview")
        .length,

      offered: applicants.filter((a) => a.status === "Offered").length,

      accepted: applicants.filter(
        (a) => a.status === "Accepted" || a.status === "Offer Accepted"
      ).length,

      onboarding: applicants.filter((a) => a.status === "Onboarding").length,

      hired: applicants.filter((a) => a.status === "Hired").length,

      rejected: applicants.filter((a) => a.status === "Rejected").length,
    };

    return stats;
  };

  const stats = calculateStats();

  // Get status badge

  const getStatusBadge = (status, showIcon = true) => {
    const statusConfig = {
      Pending: {
        color: "warning",
        icon: faClock,
        text: "Pending",
        customClass: "status-pending",
      },

      ShortListed: {
        color: "info",
        icon: faCheckCircle,
        text: "Shortlisted",
        customClass: "status-shortlisted",
      },

      "On going Interview": {
        color: "primary",
        icon: faCalendarAlt,
        text: "Interview",
        customClass: "status-interview",
      },

      Offered: {
        color: "primary",
        icon: faFileAlt,
        text: "Offered",
        customClass: "status-offered",
      },

      Accepted: {
        color: "success",
        icon: faUserPlus,
        text: "Accepted",
        customClass: "status-accepted",
      },

      "Offer Accepted": {
        color: "success",
        icon: faUserPlus,
        text: "Offer Accepted",
        customClass: "status-accepted",
      },

      Onboarding: {
        color: "info",
        icon: faUserTie,
        text: "Onboarding",
        customClass: "status-onboarding",
      },

      Hired: {
        color: "success",
        icon: faCheckCircle,
        text: "Hired",
        customClass: "status-hired",
      },

      Rejected: {
        color: "danger",
        icon: faTimesCircle,
        text: "Rejected",
        customClass: "status-rejected",
      },
    };

    const config = statusConfig[status] || statusConfig["Pending"];

    return (
      <Badge
        bg={config.color}
        className={`d-flex align-items-center gap-1 status-badge ${config.customClass}`}
      >
        {showIcon && <FontAwesomeIcon icon={config.icon} size="sm" />}

        {config.text}
      </Badge>
    );
  };

  // Handle dropdown toggle

  const toggleDropdown = (recordId) => {
    setActiveDropdown(activeDropdown === recordId ? null : recordId);
  };

  // Get onboarding steps for an applicant

  const getOnboardingSteps = (applicant) => {
    // Return empty array - onboarding steps removed

    return [];
  };

  // Handle view details

  const handleViewDetails = (record) => {
    setSelectedRecord(record);

    // Pre-populate job offer data from job posting

    if (record.status === "Offered") {
      setJobOfferData({
        payment_schedule: "Monthly",

        work_setup: "Onsite",

        offer_validity: "7 days",

        employment_type: "Full-time",

        contact_person: "",

        contact_number: "",

        department:
          record.jobPosting?.department || record.job_posting?.department || "",

        position:
          record.jobPosting?.position || record.job_posting?.position || "",

        salary:
          record.jobPosting?.salary_min && record.jobPosting?.salary_max
            ? `₱${record.jobPosting.salary_min.toLocaleString()} - ₱${record.jobPosting.salary_max.toLocaleString()}`
            : record.job_posting?.salary_min && record.job_posting?.salary_max
            ? `₱${record.job_posting.salary_min.toLocaleString()} - ₱${record.job_posting.salary_max.toLocaleString()}`
            : "",
      });

      setShowJobOfferModal(true);
    } else {
      setShowModal(true);
    }

    setActiveDropdown(null);
  };

  // Handle status change

  const handleChangeStatus = (record) => {
    // Allow status change for Pending and Interview statuses

    if (
      record.status !== "Pending" &&
      record.status !== "On going Interview" &&
      record.status !== "Interview"
    ) {
      alert("Status can only be changed from Pending or Interview status");

      setActiveDropdown(null);

      return;
    }

    setSelectedRecordForStatus(record);

    setShowStatusModal(true);

    setActiveDropdown(null);
  };

  // Handle status update

  const handleStatusUpdate = async (targetStatus) => {
    try {
      const applicantToUpdate = selectedRecord || selectedRecordForStatus;

      const response = await axios.put(
        `http://localhost:8000/api/applications/${applicantToUpdate.id}/status`,

        { status: targetStatus },

        {
          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const applicantName = applicantToUpdate.applicant
        ? `${applicantToUpdate.applicant.first_name} ${applicantToUpdate.applicant.last_name}`
        : "Applicant";

      alert(`Status updated to ${targetStatus} for ${applicantName}`);

      await fetchApplicants();

      setShowModal(false);

      setSelectedRecord(null);

      setShowStatusModal(false);

      setSelectedRecordForStatus(null);
    } catch (error) {
      console.error("Error updating status:", error);

      alert("Failed to update status. Please try again.");
    }
  };

  // Handle start onboarding confirmation

  const handleConfirmStartOnboarding = async () => {
    try {
      const applicantToUpdate = selectedRecord || selectedRecordForStatus;

      // Update status to "Onboarding" in backend

      await axios.put(
        `http://localhost:8000/api/applications/${applicantToUpdate.id}/status`,

        { status: "Onboarding" },

        {
          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const applicantName = applicantToUpdate.applicant
        ? `${applicantToUpdate.applicant.first_name} ${applicantToUpdate.applicant.last_name}`
        : "Applicant";

      // Refresh applicants list to get updated status

      await fetchApplicants();

      // Close modals

      setShowStartOnboardingModal(false);

      setShowModal(false);

      // Switch to Onboarding tab and Document Submission subtab

      setActiveTab("Onboarding");

      setOnboardingSubtab("Document Submission");

      // Clear selected record

      setSelectedRecord(null);

      setSelectedRecordForStatus(null);

      // Show success message

      alert(
        `Onboarding started for ${applicantName}. They have been moved to the Document Submission stage.`
      );
    } catch (error) {
      console.error("Error starting onboarding:", error);

      alert("Failed to start onboarding. Please try again.");
    }
  };

  // Handle resume download

  const handleDownloadResume = (applicant) => {
    // Check multiple possible resume locations

    const resumeUrl =
      applicant.resume_path || applicant.applicant?.resume || applicant.resume;

    console.log("🔍 [Download Resume] Checking resume URL:", resumeUrl);

    console.log("🔍 [Download Resume] Full applicant data:", applicant);

    if (resumeUrl) {
      // Construct full URL if needed

      const fullUrl = resumeUrl.startsWith("http")
        ? resumeUrl
        : `http://localhost:8000/storage/${resumeUrl}`;

      console.log("✅ [Download Resume] Downloading from URL:", fullUrl);

      // Create a temporary link to download the file

      const link = document.createElement("a");

      link.href = fullUrl;

      link.download = `Resume_${
        applicant.applicant?.first_name || "Applicant"
      }_${applicant.applicant?.last_name || "Resume"}.pdf`;

      link.target = "_blank";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);
    } else {
      console.error("❌ [Download Resume] No resume URL found");

      alert("Resume not available for this applicant.");
    }
  };

  // Fetch document requirements for an application

  const fetchDocumentRequirements = async (applicationId) => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/applications/${applicationId}/documents/overview`,

        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data?.success) {
        return applyDocumentOverview(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching document overview:", error);
    }

    return null;
  };

  // Fetch document submissions for an application

  const fetchDocumentSubmissions = async (applicationId) => {
    return fetchDocumentRequirements(applicationId);
  };

  const fetchFollowUpRequests = useCallback(async (applicationId) => {
    if (!applicationId) return;

    setLoadingFollowUpRequests(true);

    setFollowUpRequestsError("");

    setFollowUpRequests([]);

    try {
      const response = await axios.get(
        `http://localhost:8000/api/applications/${applicationId}/documents/follow-ups`,

        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const payload = response?.data;

      let records = [];

      if (payload?.success && Array.isArray(payload?.data)) {
        records = payload.data;
      } else if (Array.isArray(payload)) {
        records = payload;
      } else if (Array.isArray(payload?.requests)) {
        records = payload.requests;
      }

      const normalized = records.map((item, index) => ({
        id: item.id ?? item.follow_up_id ?? `followup-${index}`,

        applicantName:
          item.applicant_name ||
          `${item.applicant?.first_name || ""} ${
            item.applicant?.last_name || ""
          }`.trim() ||
          "Applicant",

        documentType: item.document_type || item.document_name || "Document",

        message: item.message || item.note || "",

        sentAt:
          item.sent_at ||
          item.created_at ||
          item.updated_at ||
          item.submitted_at ||
          null,

        attachmentUrl:
          item.attachment_url ||
          item.file_url ||
          item.document_url ||
          item.attachment ||
          null,

        status: (item.status || "Pending")?.toString(),

        extensionDays: item.extension_days ?? null,

        extensionDeadline: item.extension_deadline || null,

        hrResponse: item.hr_response || "",

        respondedAt: item.responded_at || null,

        attachmentName: item.attachment_name || null,

        raw: item,
      }));

      setFollowUpRequests(normalized);
    } catch (error) {
      console.error("Error fetching follow-up requests:", error);

      setFollowUpRequests([]);

      setFollowUpRequestsError("Failed to load follow-up requests.");
    } finally {
      setLoadingFollowUpRequests(false);
    }
  }, []);

  const handleOpenFollowUpModal = useCallback((request, action = null) => {
    if (!request) return;

    setSelectedFollowUpRequest(request);

    setFollowUpActionType(action);

    setFollowUpActionForm({
      extensionDays:
        action === "accept"
          ? Math.max(request.extensionDays || 3, 1)
          : 3,

      hrResponse: "",
    });

    setShowFollowUpModal(true);
  }, []);

  const handleCloseFollowUpModal = useCallback(() => {
    setShowFollowUpModal(false);
    setSelectedFollowUpRequest(null);
    setFollowUpActionType(null);
    setFollowUpActionForm({
      extensionDays: 3,
      hrResponse: "",
    });
    setFollowUpActionLoading(false);
  }, []);

  const handleFollowUpActionInputChange = useCallback((field, value) => {
    setFollowUpActionForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleSubmitFollowUpAction = useCallback(async () => {
    if (
      !selectedApplicationForDocs?.id ||
      !selectedFollowUpRequest ||
      !followUpActionType
    ) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Authentication is required to process follow-up requests.");
      return;
    }

    const payload = {};
    let endpoint = "";

    if (followUpActionType === "accept") {
      const days = parseInt(followUpActionForm.extensionDays, 10);
      if (!Number.isInteger(days) || days <= 0) {
        alert("Please provide a valid number of days for the extension.");
        return;
      }
      payload.extension_days = days;
      if (followUpActionForm.hrResponse.trim()) {
        payload.hr_response = followUpActionForm.hrResponse.trim();
      }
      endpoint = "accept";
    } else if (followUpActionType === "reject") {
      if (followUpActionForm.hrResponse.trim()) {
        payload.hr_response = followUpActionForm.hrResponse.trim();
      }
      endpoint = "reject";
    } else {
      return;
    }

    try {
      setFollowUpActionLoading(true);

      await axios.post(
        `http://localhost:8000/api/applications/${selectedApplicationForDocs.id}/documents/follow-ups/${selectedFollowUpRequest.id}/${endpoint}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await fetchFollowUpRequests(selectedApplicationForDocs.id);
      await fetchDocumentRequirements(selectedApplicationForDocs.id);
      alert("Follow-up request processed successfully.");
      handleCloseFollowUpModal();
    } catch (error) {
      console.error("Error processing follow-up request:", error);
      alert(
        error.response?.data?.message ||
          "Failed to process follow-up request. Please try again."
      );
    } finally {
      setFollowUpActionLoading(false);
    }
  }, [
    fetchDocumentRequirements,
    fetchFollowUpRequests,
    followUpActionForm.extensionDays,
    followUpActionForm.hrResponse,
    followUpActionType,
    handleCloseFollowUpModal,
    selectedApplicationForDocs,
    selectedFollowUpRequest,
  ]);

  const handleOpenFollowUpAttachment = useCallback(async (request) => {
    if (!request?.attachmentUrl) {
      alert("No attachment provided for this follow-up request.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in to download attachments.");
      return;
    }

    try {
      const response = await axios.get(request.attachmentUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type:
          response.data.type ||
          request.attachmentMime ||
          "application/octet-stream",
      });

      const objectUrl = window.URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener");
      setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 30000);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      alert("Failed to download attachment. Please try again.");
    }
  }, []);

  // Fetch document status for all applicants in onboarding

  const fetchAllApplicantsDocumentStatus = async () => {
    const statusMap = {};

    const allFiltered = getFilteredApplicants();

    const onboardingApplicants = allFiltered.filter(
      (applicant) =>
        applicant.status === "Onboarding" ||
        applicant.status === "Document Submission" ||
        applicant.status === "Orientation Schedule"
    );

    for (const applicant of onboardingApplicants) {
      try {
        const requirementsResponse = await axios.get(
          `http://localhost:8000/api/applications/${applicant.id}/documents/requirements`,

          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const submissionsResponse = await axios.get(
          `http://localhost:8000/api/applications/${applicant.id}/documents/submissions`,

          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (
          requirementsResponse.data.success &&
          submissionsResponse.data.success
        ) {
          const requirements = requirementsResponse.data.data || [];

          const submissions = submissionsResponse.data.data || [];

          const requiredDocs = requirements.filter((req) => req.is_required);

          if (requiredDocs.length === 0) {
            statusMap[applicant.id] = { status: "Incomplete", date: null };
          } else {
            const requiredIds = requiredDocs.map((req) => req.id);

            const approvedSubmissions = submissions.filter(
              (submission) =>
                requiredIds.includes(submission.document_requirement_id) &&
                (submission.status === "received" ||
                  submission.status === "approved")
            );

            const pendingSubmissions = submissions.filter(
              (submission) =>
                requiredIds.includes(submission.document_requirement_id) &&
                (submission.status === "pending" ||
                  submission.status === "pending_review" ||
                  submission.status === "uploaded")
            );

            const rejectedSubmissions = submissions.filter(
              (submission) =>
                requiredIds.includes(submission.document_requirement_id) &&
                submission.status === "rejected"
            );

            let overallStatus = "Incomplete";

            let latestDate = null;

            if (approvedSubmissions.length === requiredIds.length) {
              overallStatus = "Approved Documents";

              latestDate = approvedSubmissions

                .map(
                  (submission) =>
                    submission.reviewed_at || submission.submitted_at
                )

                .filter(Boolean)

                .sort()

                .reverse()[0];
            } else if (
              pendingSubmissions.length > 0 ||
              rejectedSubmissions.length > 0
            ) {
              if (rejectedSubmissions.length > 0) {
                overallStatus = "Rejected";
              } else {
                overallStatus = "Pending Review";
              }

              const allDates = [...pendingSubmissions, ...rejectedSubmissions]

                .map((submission) => submission.submitted_at)

                .filter(Boolean);

              if (allDates.length > 0) {
                latestDate = allDates.sort().reverse()[0];
              }
            }

            statusMap[applicant.id] = {
              status: overallStatus,
              date: latestDate,
            };
          }
        }
      } catch (error) {
        console.error(
          `[OnboardingDashboard] Error fetching document status for applicant ${applicant.id}:`,

          error
        );

        statusMap[applicant.id] = { status: "Incomplete", date: null };
      }
    }

    setApplicantsDocumentStatus(statusMap);
  };

  useEffect(() => {
    if (
      activeTab === "Onboarding" &&
      onboardingSubtab === "Document Submission"
    ) {
      const timer = setTimeout(() => {
        fetchAllApplicantsDocumentStatus();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [activeTab, onboardingSubtab, applicants]);

  // Create document requirement

  const createDocumentRequirement = async () => {
    try {
      const response = await axios.post(
        `http://localhost:8000/api/applications/${selectedApplicationForDocs.id}/documents/requirements`,

        newRequirement,

        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,

            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        await fetchDocumentRequirements(selectedApplicationForDocs.id);

        setNewRequirement({
          document_name: "",

          description: "",

          is_required: true,

          file_format: "JPEG, JPG, PNG, PDF",

          max_file_size_mb: 5,
        });
      }
    } catch (error) {
      console.error("Error creating document requirement:", error);

      alert("Failed to create document requirement");
    }
  };

  // Delete document requirement

  const deleteDocumentRequirement = async (requirementId) => {
    if (!window.confirm("Are you sure you want to delete this requirement?"))
      return;

    try {
      const response = await axios.delete(
        `http://localhost:8000/api/applications/${selectedApplicationForDocs.id}/documents/requirements/${requirementId}`,

        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        if (response.data.overview) {
          applyDocumentOverview(response.data.overview);
        } else {
          await fetchDocumentRequirements(selectedApplicationForDocs.id);
        }
      }
    } catch (error) {
      console.error("Error deleting document requirement:", error);

      alert("Failed to delete document requirement");
    }
  };

  // Review document submission

  const reviewDocumentSubmission = async (
    submissionId,
    status,
    reason = "",
    documentKey = null
  ) => {
    try {
      setReviewingDocument(true);

      const response = await axios.put(
        `http://localhost:8000/api/applications/${selectedApplicationForDocs.id}/documents/submissions/${submissionId}/review`,

        { status, rejection_reason: reason, document_type: documentKey },

        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,

            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        if (response.data.overview) {
          applyDocumentOverview(response.data.overview);
        } else {
          await fetchDocumentSubmissions(selectedApplicationForDocs.id);

          await fetchDocumentRequirements(selectedApplicationForDocs.id);
        }

        // Refresh applicants list to get updated status

        await fetchApplicants();

        setRejectingSubmissionId(null);

        setRejectingDocumentKey(null);

        setRejectionReason("");

        if (status === "received") {
          setApproveModalData(null);
        }

        // Check if all documents are approved

        if (response.data.all_documents_approved) {
          // Update the selected application's status in the UI

          if (selectedApplicationForDocs) {
            setSelectedApplicationForDocs({
              ...selectedApplicationForDocs,

              status:
                response.data.application_status || "Orientation Schedule",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error reviewing document:", error);
    } finally {
      setReviewingDocument(false);
    }
  };

  // Handle approve document

  const openApproveModal = (submission, doc) => {
    if (!submission) {
      return;
    }
    const derivedDocumentKey =
      submission.document_key ||
      submission.document_type ||
      doc?.documentKey ||
      doc?.document_key ||
      submission.document_requirement?.document_key ||
      (submission.document_requirement_id
        ? `requirement_${submission.document_requirement_id}`
        : null);

    setApproveModalData({
      submissionId: submission.id,
      documentTitle:
        doc?.title ||
        submission.document_requirement?.document_name ||
        "this document",
      documentKey: derivedDocumentKey,
    });
  };

  const closeApproveModal = () => {
    if (reviewingDocument) return;
    setApproveModalData(null);
  };

  const confirmApproveDocument = async () => {
    if (!approveModalData?.submissionId) {
      return;
    }
    await reviewDocumentSubmission(
      approveModalData.submissionId,
      "received",
      "",
      approveModalData.documentKey || null
    );
  };

  // Handle reject document - show rejection reason input

  const handleRejectDocument = (submission) => {
    if (!submission) {
      return;
    }

    const derivedDocumentKey =
      submission.document_key ||
      submission.document_type ||
      submission.documentRequirement?.document_key ||
      (submission.document_requirement_id
        ? `requirement_${submission.document_requirement_id}`
        : null);

    setRejectingSubmissionId(submission.id);
    setRejectingDocumentKey(derivedDocumentKey);
    setRejectionReason("");
  };

  // Confirm rejection with reason

  const confirmRejectDocument = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason.");

      return;
    }

    if (
      window.confirm(
        "Are you sure you want to reject this document? The employee will be notified to re-upload."
      )
    ) {
      await reviewDocumentSubmission(
        rejectingSubmissionId,
        "rejected",
        rejectionReason,
        rejectingDocumentKey
      );
    }
  };

  const renderDocumentCards = useCallback(
    (docs) => (
      <div className="row gy-3">
        {docs.map((doc) => {
          const {
            requirement,

            submission,

            statusLabel,

            statusVariant,

            statusDescription,

            submittedAt,

            updatedAt,

            rejectionReason,

            submissionStatus,
          } = computeApplicantDocStatus(doc);

          const statusStyle =
            statusBadgeStyles[statusVariant] || statusBadgeStyles.neutral;

          const isApproved = statusVariant === "approved";

          let requirementBadgeLabel = "";

          let requirementBadgeVariant = "secondary";

          if (submission) {
            requirementBadgeLabel = statusLabel;

            requirementBadgeVariant =
              statusVariant === "approved"
                ? "success"
                : statusVariant === "resubmit"
                ? "danger"
                : statusVariant === "pending"
                ? "warning"
                : "secondary";
          } else if (requirement) {
            requirementBadgeLabel = requirement.is_required
              ? "Required"
              : "Optional";

            requirementBadgeVariant = requirement.is_required
              ? "danger"
              : "secondary";
          }

          return (
            <div className="col-12" key={doc.key}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-3">
                    <div>
                      <h6 className="fw-semibold mb-1">{doc.title}</h6>

                      <p className="text-muted small mb-2">{doc.description}</p>

                      <div className="d-flex flex-wrap align-items-center gap-2">
                        {requirementBadgeLabel ? (
                          <Badge bg={requirementBadgeVariant}>
                            {requirementBadgeLabel}
                          </Badge>
                        ) : null}

                        {submission?.file_name && (
                          <span className="text-muted small">
                            {submission.file_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-lg-end">
                      <span
                        className="badge"
                        style={{
                          ...statusStyle,

                          borderRadius: "999px",

                          padding: "0.4rem 0.85rem",

                          fontSize: "0.75rem",

                          letterSpacing: "0.3px",
                        }}
                      >
                        {statusLabel}
                      </span>

                      {statusDescription && (
                        <div className="text-muted small mt-2">
                          {statusDescription}
                        </div>
                      )}

                      {submittedAt && (
                        <div className="text-muted small mt-2">
                          Submitted {submittedAt}
                        </div>
                      )}

                      {updatedAt && updatedAt !== submittedAt && (
                        <div className="text-muted small">
                          Last update {updatedAt}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 d-flex flex-column flex-lg-row align-items-lg-center gap-2">
                    <div>
                      {submission ? (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => openSubmissionFile(submission)}
                        >
                          View File
                        </Button>
                      ) : (
                        <span className="text-muted small">
                          No file uploaded.
                        </span>
                      )}
                    </div>

                    <div className="ms-lg-auto d-flex gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        disabled={
                          !submission || isApproved || reviewingDocument
                        }
                        onClick={() =>
                          submission && openApproveModal(submission, doc)
                        }
                      >
                        Approve
                      </Button>

                      <Button
                        variant="outline-danger"
                        size="sm"
                        disabled={
                          !submission || reviewingDocument || isApproved
                        }
                        onClick={() =>
                          submission && handleRejectDocument(submission)
                        }
                      >
                        Resubmit
                      </Button>

                      {doc.allowDelete && requirement && (
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          disabled={reviewingDocument}
                          onClick={() =>
                            deleteDocumentRequirement(requirement.id)
                          }
                        >
                          <FontAwesomeIcon icon={faTrash} className="me-2" />
                          Remove Request
                        </Button>
                      )}
                    </div>
                  </div>

                  {rejectionReason && (
                    <Alert variant="warning" className="mt-3 mb-0">
                      <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                      Last rejection note: {rejectionReason}
                    </Alert>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ),
    [
      computeApplicantDocStatus,
      deleteDocumentRequirement,
      handleRejectDocument,
      openApproveModal,
      openSubmissionFile,
      reviewingDocument,
      statusBadgeStyles,
    ]
  );

  // Check if all required documents are approved

  const allDocumentsApproved = () => {
    if (!selectedApplicationForDocs || documentRequirements.length === 0)
      return false;

    const requiredDocs = documentRequirements.filter((req) => req.is_required);

    if (requiredDocs.length === 0) return true;

    return requiredDocs.every((req) => {
      const submission = documentSubmissions.find(
        (s) => s.document_requirement_id === req.id
      );

      return (
        submission &&
        (submission.status === "received" || submission.status === "approved")
      );
    });
  };

  // Mark document submission as done and move to next tab

  const markDocumentSubmissionAsDone = async () => {
    if (!allDocumentsApproved()) {
      alert("Please approve all required documents before marking as done.");

      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to mark document submission as complete? This will move the applicant to the Orientation Schedule step."
      )
    ) {
      return;
    }

    try {
      await handleStatusUpdate("Orientation Schedule");

      setShowDocumentModal(false);

      setSelectedApplicationForDocs(null);

      setDocumentRequirements([]);

      setDocumentSubmissions([]);

      setFollowUpRequests([]);

      setFollowUpRequestsError("");

      alert(
        "Document submission completed! Applicant moved to Orientation Schedule."
      );
    } catch (error) {
      console.error("Error updating status:", error);

      alert("Failed to update status. Please try again.");
    }
  };

  // Helper functions for time parsing

  const parseTime = (timeString) => {
    if (!timeString) return { hour: "09", minute: "00" };

    const [hour, minute] = timeString.split(":");

    // Round minute to nearest allowed interval (00, 10, 20, 30, 40, 50)

    let roundedMinute = "00";

    const min = parseInt(minute) || 0;

    if (min <= 5) roundedMinute = "00";
    else if (min <= 15) roundedMinute = "10";
    else if (min <= 25) roundedMinute = "20";
    else if (min <= 35) roundedMinute = "30";
    else if (min <= 45) roundedMinute = "40";
    else roundedMinute = "50";

    return { hour: hour || "09", minute: roundedMinute };
  };

  const formatTime = (hour, minute) => {
    return `${hour.padStart(2, "0")}:${minute}`;
  };

  // Helper functions for 12-hour format

  const parseTime12Hour = (timeString) => {
    if (!timeString) return { hour: "01", minute: "00", ampm: "AM" };

    const [hour, minute] = timeString.split(":");

    const h = parseInt(hour) || 0;

    const m = parseInt(minute) || 0;

    // Round minute to nearest allowed interval

    let roundedMinute = "00";

    if (m <= 5) roundedMinute = "00";
    else if (m <= 15) roundedMinute = "10";
    else if (m <= 25) roundedMinute = "20";
    else if (m <= 35) roundedMinute = "30";
    else if (m <= 45) roundedMinute = "40";
    else roundedMinute = "50";

    // Convert to 12-hour format

    let displayHour = h;

    let ampm = "AM";

    if (h === 0) {
      displayHour = 12;

      ampm = "AM";
    } else if (h < 12) {
      displayHour = h;

      ampm = "AM";
    } else if (h === 12) {
      displayHour = 12;

      ampm = "PM";
    } else {
      displayHour = h - 12;

      ampm = "PM";
    }

    return {
      hour: displayHour.toString().padStart(2, "0"),

      minute: roundedMinute,

      ampm: ampm,
    };
  };

  const formatTime12Hour = (hour, minute, ampm) => {
    let h = parseInt(hour);

    // Convert from 12-hour to 24-hour format

    if (ampm === "AM") {
      if (h === 12) h = 0;
    } else {
      // PM

      if (h !== 12) h += 12;
    }

    return `${h.toString().padStart(2, "0")}:${minute}`;
  };

  // Handle schedule interview

  const handleScheduleInterview = (applicant) => {
    setSelectedApplicantForInterview(applicant);

    setInterviewData({
      interview_date: "",

      interview_time: "",

      end_time: "",

      interview_type: "On-site",

      location: "",

      interviewer: "",

      notes: "",
    });

    setShowInterviewModal(true);
  };

  // Handle view interview details

  const handleViewInterviewDetails = async (applicant) => {
    try {
      console.log(
        "🔍 [OnboardingDashboard] Looking for interview details for applicant:",
        applicant
      );

      console.log("🔍 [OnboardingDashboard] Applicant email options:", {
        "applicant.email": applicant.applicant?.email,

        employee_email: applicant.employee_email,

        "applicant.employee_email": applicant.applicant?.employee_email,
      });

      // Try to get interview details from localStorage first

      const storedInterviews = JSON.parse(
        localStorage.getItem("scheduledInterviews") || "[]"
      );

      console.log(
        "📅 [OnboardingDashboard] Stored interviews count:",
        storedInterviews.length
      );

      console.log(
        "📅 [OnboardingDashboard] Stored interviews:",
        storedInterviews
      );

      // Look for interview details by multiple email variations

      const interviewDetails = storedInterviews.find((interview) => {
        const applicantEmail =
          interview.applicantEmail || interview.applicant_email;

        const targetEmails = [
          applicant.applicant?.email,

          applicant.employee_email,

          applicant.applicant?.employee_email,
        ].filter(Boolean);

        console.log("🔍 [OnboardingDashboard] Comparing emails:", {
          stored: applicantEmail,

          target: targetEmails,

          match: targetEmails.includes(applicantEmail),
        });

        return targetEmails.includes(applicantEmail);
      });

      if (interviewDetails) {
        console.log(
          "✅ [OnboardingDashboard] Found interview details:",
          interviewDetails
        );

        setSelectedInterviewDetails({
          interview_date:
            interviewDetails.interviewDate || interviewDetails.interview_date,

          interview_time:
            interviewDetails.interviewTime || interviewDetails.interview_time,

          end_time: interviewDetails.endTime || interviewDetails.end_time,

          interview_type:
            interviewDetails.interviewType || interviewDetails.interview_type,

          location: interviewDetails.location,

          interviewer: interviewDetails.interviewer,

          notes: interviewDetails.notes,

          applicant: applicant,
        });

        setShowInterviewDetailsModal(true);
      } else {
        // Try to get from notifications as fallback

        const storedNotifications = JSON.parse(
          localStorage.getItem("applicantNotifications") || "[]"
        );

        console.log(
          "📅 [OnboardingDashboard] Stored notifications count:",
          storedNotifications.length
        );

        const interviewNotification = storedNotifications.find(
          (notification) => {
            const notificationEmail =
              notification.applicantEmail || notification.applicant_email;

            const targetEmails = [
              applicant.applicant?.email,

              applicant.employee_email,

              applicant.applicant?.employee_email,
            ].filter(Boolean);

            return (
              notification.type === "interview_scheduled" &&
              targetEmails.includes(notificationEmail)
            );
          }
        );

        if (interviewNotification) {
          console.log(
            "✅ [OnboardingDashboard] Found interview details in notifications:",
            interviewNotification
          );

          setSelectedInterviewDetails({
            interview_date:
              interviewNotification.interviewDate ||
              interviewNotification.interview_date,

            interview_time:
              interviewNotification.interviewTime ||
              interviewNotification.interview_time,

            end_time:
              interviewNotification.endTime || interviewNotification.end_time,

            interview_type:
              interviewNotification.interviewType ||
              interviewNotification.interview_type,

            location: interviewNotification.location,

            interviewer: interviewNotification.interviewer,

            notes: interviewNotification.notes,

            applicant: applicant,
          });

          setShowInterviewDetailsModal(true);
        } else {
          // Try to find by name as last resort

          const nameMatch = storedInterviews.find((interview) => {
            const storedName =
              interview.applicantName || interview.applicant_name;

            const applicantName =
              `${applicant.applicant?.first_name || ""} ${
                applicant.applicant?.last_name || ""
              }`.trim() || applicant.employee_name;

            return (
              storedName &&
              applicantName &&
              storedName.toLowerCase().includes(applicantName.toLowerCase())
            );
          });

          if (nameMatch) {
            console.log(
              "✅ [OnboardingDashboard] Found interview details by name match:",
              nameMatch
            );

            setSelectedInterviewDetails({
              interview_date:
                nameMatch.interviewDate || nameMatch.interview_date,

              interview_time:
                nameMatch.interviewTime || nameMatch.interview_time,

              end_time: nameMatch.endTime || nameMatch.end_time,

              interview_type:
                nameMatch.interviewType || nameMatch.interview_type,

              location: nameMatch.location,

              interviewer: nameMatch.interviewer,

              notes: nameMatch.notes,

              applicant: applicant,
            });

            setShowInterviewDetailsModal(true);
          } else {
            console.log("❌ [OnboardingDashboard] No interview details found");

            console.log(
              "❌ [OnboardingDashboard] Available stored interviews:",
              storedInterviews.map((i) => ({
                email: i.applicantEmail || i.applicant_email,

                name: i.applicantName || i.applicant_name,
              }))
            );

            alert(
              "No interview details found for this applicant. Please schedule an interview first."
            );
          }
        }
      }
    } catch (error) {
      console.error("Error fetching interview details:", error);

      alert("Failed to load interview details.");
    }
  };

  // Handle offer job - Open Job Offer modal instead of immediate confirmation

  const handleOfferJob = (applicant) => {
    // Close interview details modal

    setShowInterviewDetailsModal(false);

    setSelectedInterviewDetails(null);

    // Pre-populate job offer data from job posting

    setSelectedRecord(applicant);

    setJobOfferData({
      payment_schedule: "Monthly",

      work_setup: "Onsite",

      offer_validity: "7 days",

      employment_type: "Full-time",

      contact_person: "",

      contact_number: "",

      department:
        applicant.jobPosting?.department ||
        applicant.job_posting?.department ||
        "",

      position:
        applicant.jobPosting?.position || applicant.job_posting?.position || "",

      salary:
        applicant.jobPosting?.salary_min && applicant.jobPosting?.salary_max
          ? `₱${applicant.jobPosting.salary_min.toLocaleString()} - ₱${applicant.jobPosting.salary_max.toLocaleString()}`
          : applicant.job_posting?.salary_min &&
            applicant.job_posting?.salary_max
          ? `₱${applicant.job_posting.salary_min.toLocaleString()} - ₱${applicant.job_posting.salary_max.toLocaleString()}`
          : "",
    });

    // Open job offer modal

    setShowJobOfferModal(true);
  };

  // Handle reject applicant

  const handleRejectApplicant = async (applicant) => {
    if (
      window.confirm(
        `Are you sure you want to reject ${
          applicant.applicant?.first_name || "this applicant"
        }?`
      )
    ) {
      try {
        const token = localStorage.getItem("token");

        await axios.put(
          `http://localhost:8000/api/applications/${applicant.id}/status`,

          { status: "Rejected" },

          {
            headers: {
              Authorization: `Bearer ${token}`,

              "Content-Type": "application/json",
            },
          }
        );

        alert("Applicant has been rejected.");

        setShowInterviewDetailsModal(false);

        setSelectedInterviewDetails(null);

        await fetchApplicants(); // Refresh the list

        setActiveTab("Rejected");
      } catch (error) {
        console.error("Error rejecting applicant:", error);

        alert("Failed to reject applicant. Please try again.");
      }
    }
  };

  // Handle job offer submission

  const handleSubmitJobOffer = async () => {
    try {
      if (!jobOfferData.contact_person || !jobOfferData.contact_number) {
        alert(
          "Please fill in all required fields: Contact Person and Contact Number"
        );

        return;
      }

      // Send job offer to backend with all details

      const token = localStorage.getItem("token");

      const response = await axios.post(
        `http://localhost:8000/api/applications/${selectedRecord.id}/send-offer`,

        {
          department: jobOfferData.department,

          position: jobOfferData.position,

          salary: jobOfferData.salary,

          payment_schedule: jobOfferData.payment_schedule,

          employment_type: jobOfferData.employment_type,

          work_setup: jobOfferData.work_setup,

          offer_validity: jobOfferData.offer_validity,

          contact_person: jobOfferData.contact_person,

          contact_number: jobOfferData.contact_number,
        },

        {
          headers: {
            Authorization: `Bearer ${token}`,

            "Content-Type": "application/json",
          },
        }
      );

      alert("Job offer sent successfully!");

      setShowJobOfferModal(false);

      setSelectedRecord(null);

      // Refresh the list

      await fetchApplicants();

      // Switch to Offered tab after sending offer

      setActiveTab("Offered");

      // Reset form

      setJobOfferData({
        payment_schedule: "Monthly",

        work_setup: "Onsite",

        offer_validity: "7 days",

        employment_type: "Full-time",

        contact_person: "",

        contact_number: "",

        department: "",

        position: "",

        salary: "",
      });
    } catch (error) {
      console.error("Error submitting job offer:", error);

      alert("Failed to send job offer. Please try again.");
    }
  };

  // Handle send interview invite

  const handleSendInterviewInvite = async () => {
    try {
      // Validate required fields

      if (
        !interviewData.interview_date ||
        !interviewData.interview_time ||
        !interviewData.end_time ||
        !interviewData.location ||
        !interviewData.interviewer
      ) {
        alert(
          "Please fill in all required fields: Date, Start Time, End Time, Location, and Interviewer"
        );

        return;
      }

      const token = localStorage.getItem("token");

      const response = await axios.post(
        `http://localhost:8000/api/applications/${selectedApplicantForInterview.id}/schedule-interview`,

        {
          interview_date: interviewData.interview_date,

          interview_time: interviewData.interview_time,

          end_time: interviewData.end_time,

          interview_type: interviewData.interview_type,

          location: interviewData.location,

          interviewer: interviewData.interviewer,

          notes: interviewData.notes,
        },

        {
          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Show appropriate message based on whether it was created or updated

      if (response.data?.updated) {
        alert(
          "Interview invite updated successfully! The applicant's existing invite has been updated with new details."
        );
      } else {
        alert("Interview invitation sent successfully!");
      }

      // Save interview details to localStorage

      saveInterviewToLocalStorage(selectedApplicantForInterview, interviewData);

      setShowInterviewModal(false);

      setSelectedApplicantForInterview(null);

      await fetchApplicants();
    } catch (error) {
      console.error("Error scheduling interview:", error);

      if (error?.response?.status === 403) {
        alert(
          error?.response?.data?.message ||
            "You don't have permission to schedule interviews. Only HR Staff and HR Assistants can schedule interviews."
        );
      } else if (error?.response?.status === 401) {
        alert("Authentication required. Please log in again.");
      } else if (error?.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert("Failed to schedule interview. Please try again.");
      }
    }
  };

  // Save interview details to localStorage

  const saveInterviewToLocalStorage = (applicant, interviewData) => {
    try {
      const interviewDetails = {
        id: Date.now(),

        applicationId: applicant.id,

        applicantEmail: applicant.applicant?.email || applicant.employee_email,

        applicantName:
          applicant.applicant?.first_name +
            " " +
            applicant.applicant?.last_name || applicant.employee_name,

        position:
          applicant.jobPosting?.position ||
          applicant.job_posting?.position ||
          "N/A",

        department:
          applicant.jobPosting?.department ||
          applicant.job_posting?.department ||
          "N/A",

        interviewDate: interviewData.interview_date,

        interviewTime: interviewData.interview_time,

        endTime: interviewData.end_time,

        interviewType: interviewData.interview_type,

        location: interviewData.location,

        interviewer: interviewData.interviewer,

        notes: interviewData.notes,

        status: "scheduled",

        createdAt: new Date().toISOString(),

        updatedAt: new Date().toISOString(),
      };

      // Store interview details

      const existingInterviews = JSON.parse(
        localStorage.getItem("scheduledInterviews") || "[]"
      );

      // Remove any existing interview for this applicant to avoid duplicates

      const filteredInterviews = existingInterviews.filter(
        (interview) =>
          interview.applicantEmail !== interviewDetails.applicantEmail
      );

      filteredInterviews.unshift(interviewDetails);

      localStorage.setItem(
        "scheduledInterviews",
        JSON.stringify(filteredInterviews)
      );

      console.log(
        "✅ [OnboardingDashboard] Interview details saved to localStorage:",
        interviewDetails
      );
    } catch (error) {
      console.error(
        "❌ [OnboardingDashboard] Error saving interview to localStorage:",
        error
      );
    }
  };

  // Handle batch interview selection

  const handleBatchInterviewSelection = (applicant) => {
    setSelectedApplicants((prev) => {
      const isSelected = prev.some((selected) => selected.id === applicant.id);

      if (isSelected) {
        return prev.filter((selected) => selected.id !== applicant.id);
      } else {
        return [...prev, applicant];
      }
    });
  };

  // Toggle expand row to show applied date

  const toggleRowExpand = (recordId) => {
    setExpandedRowId((prev) => (prev === recordId ? null : recordId));
  };

  // Handle batch interview modal

  const handleBatchInterviewModal = () => {
    if (selectedApplicants.length === 0) {
      alert(
        "Please select at least one applicant for batch interview scheduling."
      );

      return;
    }

    setShowBatchInterviewModal(true);
  };

  // Handle send batch interview invites

  const handleSendBatchInterviewInvites = async () => {
    try {
      // Validate required fields

      if (
        !batchInterviewData.interview_date ||
        !batchInterviewData.interview_time ||
        !batchInterviewData.end_time ||
        !batchInterviewData.location ||
        !batchInterviewData.interviewer
      ) {
        alert(
          "Please fill in all required fields: Date, Start Time, End Time, Location, and Interviewer"
        );

        return;
      }

      const token = localStorage.getItem("token");

      const applicationIds = selectedApplicants.map(
        (applicant) => applicant.id
      );

      const response = await axios.post(
        "http://localhost:8000/api/applications/schedule-batch-interviews",

        {
          application_ids: applicationIds,

          interview_date: batchInterviewData.interview_date,

          interview_time: batchInterviewData.interview_time,

          end_time: batchInterviewData.end_time,

          interview_type: batchInterviewData.interview_type,

          location: batchInterviewData.location,

          interviewer: batchInterviewData.interviewer,

          notes: batchInterviewData.notes,
        },

        {
          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,
          },
        }
      );

      const {
        successful_count,
        failed_count,
        successful_interviews,
        failed_interviews,
      } = response.data;

      let message = `Batch interview scheduling completed!\n\n`;

      message += `✅ Successful: ${successful_count} interviews scheduled\n`;

      if (failed_count > 0) {
        message += `❌ Failed: ${failed_count} interviews\n\n`;

        message += `Failed applicants:\n`;

        failed_interviews.forEach((failed) => {
          const applicant = selectedApplicants.find(
            (app) => app.id === failed.application_id
          );

          const reason = failed.reason || failed.error || "Unknown error";

          message += `• ${
            applicant
              ? applicant.applicant?.first_name +
                " " +
                applicant.applicant?.last_name
              : "Unknown"
          }: ${reason}\n`;
        });
      }

      alert(message);

      // Save interview details to localStorage for successful interviews

      selectedApplicants.forEach((applicant) => {
        saveInterviewToLocalStorage(applicant, batchInterviewData);
      });

      setShowBatchInterviewModal(false);

      setSelectedApplicants([]);

      await fetchApplicants();
    } catch (error) {
      console.error("Error scheduling batch interviews:", error);

      alert("Failed to schedule batch interviews. Please try again.");
    }
  };

  // Handle resume view

  const handleViewResume = (applicant) => {
    // Check multiple possible resume locations

    const resumeUrl =
      applicant.resume_path || applicant.applicant?.resume || applicant.resume;

    console.log("🔍 [View Resume] Checking resume URL:", resumeUrl);

    console.log("🔍 [View Resume] Full applicant data:", applicant);

    if (resumeUrl) {
      // Construct full URL dynamically for online accessibility

      let fullUrl;

      if (resumeUrl.startsWith("http")) {
        // Already a full URL, use as is

        fullUrl = resumeUrl;
      } else {
        // Construct URL using current host for online accessibility

        const currentHost = window.location.hostname;

        const protocol = window.location.protocol;

        // Use the same protocol and hostname as the current page

        // Point to backend on port 8000 for storage

        fullUrl = `${protocol}//${currentHost}:8000/storage/${resumeUrl}`;
      }

      console.log("✅ [View Resume] Opening URL:", fullUrl);

      window.open(fullUrl, "_blank");
    } else {
      console.error("❌ [View Resume] No resume URL found");

      alert("Resume not available for this applicant.");
    }
  };

  if (loading) {
    return (
      <Container fluid className="p-4">
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: "400px" }}
        >
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  const filteredApplicants = getFilteredApplicants();

  return (
    <Container fluid className="p-4">
      {/* Professional Navigation Bar */}

      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="mb-0">
                {activeTab === "Overview"
                  ? "All Applications"
                  : `${activeTab} Applications`}

                <Badge bg="secondary" className="ms-2">
                  {filteredApplicants.length}
                </Badge>
              </h4>

              {activeTab === "Overview" && null}
            </div>

            <div>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={fetchApplicants}
                disabled={loading}
                className="d-flex align-items-center"
              >
                <FontAwesomeIcon icon={faRefresh} className="me-1" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Batch Actions Bar */}

          {selectedApplicants.length > 0 && (
            <div className="alert alert-info d-flex justify-content-between align-items-center mb-4">
              <div>
                <FontAwesomeIcon icon={faUsers} className="me-2" />
                <strong>{selectedApplicants.length}</strong> applicant(s)
                selected
              </div>

              <div className="d-flex gap-2">
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleBatchInterviewModal}
                >
                  <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                  Schedule Batch Interview
                </Button>

                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setSelectedApplicants([])}
                >
                  <FontAwesomeIcon icon={faTimes} className="me-2" />
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          <div className="professional-navbar">
            <Button
              className={`nav-tab ${activeTab === "Overview" ? "active" : ""}`}
              onClick={() => setActiveTab("Overview")}
            >
              Overview
            </Button>

            <Button
              className={`nav-tab ${activeTab === "Pending" ? "active" : ""}`}
              onClick={() => setActiveTab("Pending")}
            >
              Pending
            </Button>

            <Button
              className={`nav-tab ${
                activeTab === "Shortlisted" ? "active" : ""
              }`}
              onClick={() => setActiveTab("Shortlisted")}
            >
              Shortlisted
            </Button>

            <Button
              className={`nav-tab ${activeTab === "Interview" ? "active" : ""}`}
              onClick={() => setActiveTab("Interview")}
            >
              Interview
            </Button>

            <Button
              className={`nav-tab ${activeTab === "Offered" ? "active" : ""}`}
              onClick={() => setActiveTab("Offered")}
            >
              Offered
            </Button>

            <Button
              className={`nav-tab ${
                activeTab === "Accepted Offer" ? "active" : ""
              }`}
              onClick={() => setActiveTab("Accepted Offer")}
            >
              Accepted Offer
            </Button>

            <Button
              className={`nav-tab ${
                activeTab === "Onboarding" ? "active" : ""
              }`}
              onClick={() => setActiveTab("Onboarding")}
            >
              Onboarding
            </Button>

            <Button
              className={`nav-tab ${activeTab === "Hired" ? "active" : ""}`}
              onClick={() => setActiveTab("Hired")}
            >
              Hired
            </Button>

            <Button
              className={`nav-tab ${activeTab === "Rejected" ? "active" : ""}`}
              onClick={() => setActiveTab("Rejected")}
            >
              Rejected
            </Button>
          </div>
        </Col>
      </Row>

      {/* Content Section */}

      <Row className="mt-3">
        <Col>
          <div className="content-section">
            {/* Onboarding Management Tabs - Only show when Onboarding tab is active */}

            {activeTab === "Onboarding" && (
              <div className="mb-4">
                <div
                  className="d-flex flex-wrap mb-4"
                  style={{
                    borderBottom: "2px solid #e9ecef",
                    paddingBottom: "0",
                    marginBottom: "24px",
                    gap: "0.49rem",
                  }}
                >
                  {onboardingTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setOnboardingSubtab(tab)}
                      className={`btn ${
                        onboardingSubtab === tab
                          ? "btn-primary"
                          : "btn-link text-decoration-none"
                      }`}
                      style={{
                        borderRadius: "0",

                        borderBottom:
                          onboardingSubtab === tab
                            ? "3px solid #6f42c1"
                            : "3px solid transparent",

                        padding: "10.8px 18.6px",
                        fontSize: "0.95rem",

                        fontWeight: onboardingSubtab === tab ? 600 : 400,

                        color: onboardingSubtab === tab ? "#ffffff" : "#6c757d",

                        backgroundColor:
                          onboardingSubtab === tab ? "#6f42c1" : "transparent",

                        transition: "all 0.2s ease",

                        marginBottom: "-2px",
                      }}
                      onMouseEnter={(e) => {
                        if (onboardingSubtab !== tab) {
                          e.target.style.color = "#0d6efd";

                          e.target.style.backgroundColor =
                            "rgba(13, 110, 253, 0.05)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (onboardingSubtab !== tab) {
                          e.target.style.color = "#6c757d";

                          e.target.style.backgroundColor = "transparent";
                        } else {
                          e.target.style.color = "#ffffff";

                          e.target.style.backgroundColor = "#6f42c1";
                        }
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}

                {onboardingSubtab === "Document Submission" && (
                  <div>
                    <div className="card border-0 shadow-sm mb-3">
                      <div className="card-body p-3">
                        <div className="d-flex flex-wrap align-items-center gap-3">
                          <div className="d-flex gap-2 flex-wrap">
                            {["All", "Approved", "Rejected"].map((filter) => (
                              <Button
                                key={filter}
                                variant={
                                  documentFilter === filter
                                    ? "primary"
                                    : "outline-secondary"
                                }
                                size="sm"
                                onClick={() => setDocumentFilter(filter)}
                                style={{
                                  borderRadius: "6px",

                                  fontWeight:
                                    documentFilter === filter ? 600 : 400,
                                }}
                              >
                                {filter}
                              </Button>
                            ))}
                          </div>

                          <div
                            className="flex-grow-1"
                            style={{ minWidth: "250px" }}
                          >
                            <div className="input-group">
                              <span className="input-group-text bg-white">
                                <FontAwesomeIcon
                                  icon={faSearch}
                                  className="text-muted"
                                />
                              </span>

                              <input
                                type="text"
                                className="form-control"
                                placeholder="Search by applicant name..."
                                value={documentSearchTerm}
                                onChange={(e) =>
                                  setDocumentSearchTerm(e.target.value)
                                }
                                style={{ borderLeft: "none" }}
                              />
                            </div>
                          </div>

                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={fetchAllApplicantsDocumentStatus}
                            style={{ borderRadius: "6px" }}
                          >
                            <FontAwesomeIcon
                              icon={faRefresh}
                              className="me-2"
                            />
                            Refresh
                          </Button>
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const allFiltered = getFilteredApplicants();

                      const onboardingApplicants = allFiltered.filter(
                        (applicant) =>
                          applicant.status === "Onboarding" ||
                          applicant.status === "Document Submission" ||
                          applicant.status === "Orientation Schedule"
                      );

                      const searchTerm = documentSearchTerm
                        .trim()
                        .toLowerCase();

                      const filtered = onboardingApplicants.filter(
                        (applicant) => {
                          const nameVariants = [
                            `${applicant.applicant?.first_name || ""} ${
                              applicant.applicant?.last_name || ""
                            }`.trim(),

                            applicant.employee_name || "",
                          ]

                            .filter(Boolean)

                            .map((value) => value.toLowerCase());

                          const matchesSearch =
                            !searchTerm ||
                            nameVariants.some((value) =>
                              value.includes(searchTerm)
                            );

                          const docStatus =
                            applicantsDocumentStatus[applicant.id]?.status ||
                            "Incomplete";

                          let matchesFilter = true;

                          if (documentFilter === "Pending") {
                            matchesFilter =
                              docStatus === "Pending Review" ||
                              docStatus === "uploaded";
                          } else if (documentFilter === "Approved") {
                            matchesFilter =
                              docStatus === "Approved" ||
                              docStatus === "Approved Documents";
                          } else if (documentFilter === "Rejected") {
                            matchesFilter = docStatus === "Rejected";
                          }

                          return matchesSearch && matchesFilter;
                        }
                      );

                      if (filtered.length === 0) {
                        return (
                          <div className="card border-0 shadow-sm">
                            <div className="card-body text-center py-5">
                              <h5 className="text-muted mb-2">
                                No Applicants Found
                              </h5>

                              <p className="text-muted mb-0">
                                {searchTerm || documentFilter !== "All"
                                  ? "No applicants match your search or filter criteria."
                                  : "Applicants will appear here once onboarding starts."}
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="card border-0 shadow-sm">
                          <div className="card-body p-0">
                            <div className="table-responsive">
                              <Table hover className="mb-0">
                                <thead style={{ backgroundColor: "#f8f9fa" }}>
                                  <tr>
                                    <th
                                      style={{
                                        padding: "16px",
                                        fontWeight: 600,
                                        color: "#495057",
                                      }}
                                    >
                                      Applicant
                                    </th>

                                    <th
                                      style={{
                                        padding: "16px",
                                        fontWeight: 600,
                                        color: "#495057",
                                      }}
                                    >
                                      Department &amp; Position
                                    </th>

                                    <th
                                      style={{
                                        padding: "16px",
                                        fontWeight: 600,
                                        color: "#495057",
                                      }}
                                    >
                                      Documents
                                    </th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {filtered.map((applicant) => {
                                    const docStatus =
                                      applicantsDocumentStatus[applicant.id]
                                        ?.status || "Incomplete";

                                    const submittedDate =
                                      applicantsDocumentStatus[applicant.id]
                                        ?.date;

                                    let statusVariant = "";

                                    let statusLabel = "";

                                    if (
                                      docStatus === "Approved Documents" ||
                                      docStatus === "Approved"
                                    ) {
                                      statusVariant = "success";

                                      statusLabel = "Approved Documents";
                                    } else if (
                                      docStatus === "Pending Review" ||
                                      docStatus === "uploaded"
                                    ) {
                                      statusVariant = "warning";

                                      statusLabel = "Pending Review";
                                    } else if (docStatus === "Rejected") {
                                      statusVariant = "danger";

                                      statusLabel = "Rejected";
                                    } else if (
                                      docStatus &&
                                      docStatus !== "Incomplete"
                                    ) {
                                      statusVariant = "secondary";

                                      statusLabel = docStatus;
                                    }

                                    const formattedDate = submittedDate
                                      ? new Date(
                                          submittedDate
                                        ).toLocaleDateString("en-US", {
                                          month: "short",

                                          day: "numeric",

                                          year: "numeric",
                                        })
                                      : null;

                                    const department =
                                      applicant.jobPosting?.department ||
                                      applicant.job_posting?.department ||
                                      "N/A";

                                    const position =
                                      applicant.jobPosting?.position ||
                                      applicant.job_posting?.position ||
                                      "";

                                    const applicantName = applicant.applicant
                                      ? `${
                                          applicant.applicant.first_name || ""
                                        } ${
                                          applicant.applicant.last_name || ""
                                        }`.trim()
                                      : applicant.employee_name || "N/A";

                                    const applicantEmail =
                                      applicant.applicant?.email ||
                                      applicant.employee_email ||
                                      "N/A";

                                    return (
                                      <tr
                                        key={applicant.id}
                                        style={{
                                          borderBottom: "1px solid #e9ecef",
                                        }}
                                      >
                                        <td
                                          style={{
                                            padding: "16px",
                                            verticalAlign: "middle",
                                          }}
                                        >
                                          <div
                                            className="fw-semibold"
                                            style={{
                                              color: "#212529",
                                              marginBottom: "4px",
                                            }}
                                          >
                                            {applicantName || "N/A"}
                                          </div>

                                          <div className="small text-muted">
                                            {applicantEmail}
                                          </div>
                                        </td>

                                        <td
                                          style={{
                                            padding: "16px",
                                            verticalAlign: "middle",
                                          }}
                                        >
                                          <div
                                            style={{
                                              color: "#495057",
                                              marginBottom: position
                                                ? "4px"
                                                : "0",
                                            }}
                                          >
                                            {department}
                                          </div>

                                          {position && (
                                            <div
                                              style={{
                                                color: "#6c757d",
                                                fontStyle: "italic",
                                                fontSize: "0.9rem",
                                              }}
                                            >
                                              {position}
                                            </div>
                                          )}
                                        </td>

                                        <td
                                          style={{
                                            padding: "16px",
                                            verticalAlign: "middle",
                                          }}
                                        >
                                          <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-2">
                                            {statusLabel && (
                                              <Badge
                                                bg={statusVariant}
                                                className="px-3 py-2"
                                                style={{
                                                  fontSize: "0.8rem",
                                                  borderRadius: "999px",
                                                }}
                                              >
                                                {statusLabel}
                                              </Badge>
                                            )}

                                            {formattedDate && (
                                              <div className="text-muted small">{`Submitted ${formattedDate}`}</div>
                                            )}

                                            <div className="d-flex flex-wrap gap-2">
                                              <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => {
                                                  setSelectedApplicationForDocs(
                                                    applicant
                                                  );

                                                  setShowDocumentModal(true);

                                                  setDocumentModalTab(
                                                    "Applicant Identification"
                                                  );

                                                  fetchDocumentRequirements(
                                                    applicant.id
                                                  );

                                                  fetchDocumentSubmissions(
                                                    applicant.id
                                                  );

                                                  fetchFollowUpRequests(
                                                    applicant.id
                                                  );
                                                }}
                                                style={{ borderRadius: "6px" }}
                                              >
                                                View / Verify Documents
                                              </Button>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Other tabs - Placeholder content */}

                {onboardingSubtab !== "Document Submission" && (
                  <div className="card border-0 shadow-sm">
                    <div className="card-body text-center py-5">
                      <h5 className="text-muted mb-2">{onboardingSubtab}</h5>

                      <p className="text-muted mb-0">
                        {onboardingTabDescriptions[onboardingSubtab] ||
                          "This section is coming soon."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab !== "Onboarding" && filteredApplicants.length === 0 ? (
              <div className="text-center py-5">
                <FontAwesomeIcon
                  icon={faUsers}
                  size="3x"
                  className="text-muted mb-3"
                />

                <h5 className="text-muted mb-2">No Applications Found</h5>

                <p className="text-muted mb-3">
                  {activeTab === "Overview"
                    ? "No applications available at the moment."
                    : `No ${activeTab.toLowerCase()} applications found.`}
                </p>
              </div>
            ) : (
              activeTab !== "Onboarding" && (
                <div
                  className="onboarding-list"
                  style={{ background: "transparent" }}
                >
                  {activeTab === "Shortlisted" && (
                    <div
                      className="list-header d-flex align-items-center mb-2"
                      style={{ gap: "10px" }}
                    >
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedApplicants(filteredApplicants);
                          } else {
                            setSelectedApplicants([]);
                          }
                        }}
                        checked={
                          selectedApplicants.length ===
                            filteredApplicants.length &&
                          filteredApplicants.length > 0
                        }
                      />

                      <span
                        className="text-muted"
                        style={{ fontSize: "0.9rem" }}
                      >
                        Select all
                      </span>
                    </div>
                  )}

                  {filteredApplicants.map((applicant) => (
                    <div
                      key={applicant.id}
                      className={`onboarding-card ${
                        expandedRowId === applicant.id ? "expanded" : ""
                      }`}
                      onClick={
                        activeTab === "Overview"
                          ? undefined
                          : () => toggleRowExpand(applicant.id)
                      }
                      style={{
                        cursor:
                          activeTab === "Overview" ? "default" : "pointer",

                        background: "var(--bs-body-bg, #fff)",

                        border: "1px solid rgba(0,0,0,0.06)",

                        borderRadius: "10px",

                        padding: "12px 14px",

                        marginBottom: "10px",
                      }}
                    >
                      <div
                        className="d-flex align-items-center"
                        style={{ gap: "12px" }}
                      >
                        {activeTab === "Shortlisted" && (
                          <input
                            type="checkbox"
                            checked={selectedApplicants.some(
                              (selected) => selected.id === applicant.id
                            )}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() =>
                              handleBatchInterviewSelection(applicant)
                            }
                          />
                        )}

                        <div
                          className="flex-grow-1 d-flex align-items-center"
                          style={{
                            gap: activeTab === "Overview" ? "0.2in" : "14px",
                          }}
                        >
                          <div
                            className="avatar me-1"
                            style={{ flex: "0 0 auto" }}
                          >
                            {applicant.applicant?.first_name
                              ? applicant.applicant.first_name
                                  .charAt(0)
                                  .toUpperCase()
                              : "A"}
                          </div>

                          <div
                            className="applicant-info"
                            style={{ minWidth: 0 }}
                          >
                            <div
                              className="text-muted"
                              style={{
                                fontSize: "0.75rem",
                                marginBottom: "2px",
                              }}
                            >
                              Name & Email
                            </div>

                            <div
                              className="applicant-name"
                              style={{ fontWeight: 600 }}
                            >
                              {applicant.applicant
                                ? `${applicant.applicant.first_name || ""} ${
                                    applicant.applicant.last_name || ""
                                  }`.trim()
                                : "N/A"}
                            </div>

                            <div
                              className="applicant-email text-muted"
                              style={{ fontSize: "0.85rem" }}
                            >
                              {applicant.applicant?.email || "N/A"}
                            </div>
                          </div>

                          <div
                            className="vr-sep"
                            style={{
                              borderLeft: "1px solid rgba(0,0,0,0.12)",
                              height: "24px",
                            }}
                          ></div>

                          <div
                            className="position-text"
                            title={
                              applicant.jobPosting?.position ||
                              applicant.job_posting?.position ||
                              "N/A"
                            }
                            style={{
                              marginLeft:
                                activeTab === "Overview" ? "0.2in" : "5px",
                              flex: "1 1 auto",
                            }}
                          >
                            <div
                              className="text-muted"
                              style={{
                                fontSize: "0.75rem",
                                marginBottom: "2px",
                              }}
                            >
                              Position
                            </div>

                            {applicant.jobPosting?.position ||
                              applicant.job_posting?.position ||
                              "N/A"}
                          </div>

                          <div
                            className="vr-sep"
                            style={{
                              borderLeft: "1px solid rgba(0,0,0,0.12)",
                              height: "24px",
                            }}
                          ></div>

                          <div
                            className="department-text"
                            title={
                              applicant.jobPosting?.department ||
                              applicant.job_posting?.department ||
                              "N/A"
                            }
                            style={{
                              marginLeft:
                                activeTab === "Overview" ? "0.2in" : "5px",
                              flex: "1 1 auto",
                            }}
                          >
                            <div
                              className="text-muted"
                              style={{
                                fontSize: "0.75rem",
                                marginBottom: "2px",
                              }}
                            >
                              Department
                            </div>

                            <span>
                              {applicant.jobPosting?.department ||
                                applicant.job_posting?.department ||
                                "N/A"}
                            </span>
                          </div>

                          <div
                            className="vr-sep"
                            style={{
                              borderLeft: "1px solid rgba(0,0,0,0.12)",
                              height: "24px",
                            }}
                          ></div>

                          {activeTab === "Overview" && (
                            <div
                              className="applied-date-text"
                              style={{ marginLeft: "5px", flex: "1 1 auto" }}
                            >
                              <div
                                className="text-muted"
                                style={{
                                  fontSize: "0.75rem",
                                  marginBottom: "2px",
                                }}
                              >
                                Applied Date
                              </div>

                              <div style={{ fontSize: "0.85rem" }}>
                                {applicant.applied_at
                                  ? new Date(
                                      applicant.applied_at
                                    ).toLocaleDateString()
                                  : "N/A"}

                                {applicant.applied_at && (
                                  <div
                                    className="text-muted"
                                    style={{
                                      fontSize: "0.75rem",
                                      marginTop: "2px",
                                    }}
                                  >
                                    {new Date(
                                      applicant.applied_at
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div
                            className="ms-auto d-flex align-items-center"
                            style={{
                              marginLeft:
                                activeTab === "Overview" ? "0.2in" : "5px",
                              gap: "8px",
                            }}
                          >
                            <div>
                              <div
                                className="text-muted"
                                style={{
                                  fontSize: "0.75rem",
                                  marginBottom: "2px",
                                }}
                              >
                                Status
                              </div>

                              <div className="status-container">
                                {getStatusBadge(
                                  applicant.status,
                                  activeTab !== "Accepted Offer"
                                )}
                              </div>
                            </div>

                            {activeTab === "Pending" && (
                              <>
                                <div
                                  className="vr-sep"
                                  style={{
                                    borderLeft: "1px solid rgba(0,0,0,0.12)",
                                    height: "24px",
                                  }}
                                ></div>

                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDetails(applicant);
                                  }}
                                  className="view-details-btn"
                                  style={{
                                    padding: "15px 10px",

                                    fontSize: "15px",

                                    whiteSpace: "nowrap",

                                    height: "35px",

                                    minWidth: "90px",

                                    display: "flex",

                                    alignItems: "center",

                                    justifyContent: "center",
                                  }}
                                >
                                  View
                                </Button>
                              </>
                            )}

                            {activeTab === "Shortlisted" && (
                              <>
                                <div
                                  className="vr-sep"
                                  style={{
                                    borderLeft: "1px solid rgba(0,0,0,0.12)",
                                    height: "24px",
                                  }}
                                ></div>

                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleScheduleInterview(applicant);
                                  }}
                                  className="schedule-interview-btn"
                                  style={{
                                    whiteSpace: "nowrap",

                                    fontSize: "12px",

                                    padding: "8% 10%",

                                    height: "3px",

                                    minWidth: "110px",

                                    maxWidth: "120px",

                                    border: "1px solid transparent",

                                    display: "flex",

                                    alignItems: "center",

                                    justifyContent: "center",
                                  }}
                                >
                                  Schedule Interview
                                </Button>
                              </>
                            )}

                            {activeTab === "Interview" && (
                              <>
                                <div
                                  className="vr-sep"
                                  style={{
                                    borderLeft: "1px solid rgba(0,0,0,0.12)",
                                    height: "24px",
                                  }}
                                ></div>

                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewInterviewDetails(applicant);
                                  }}
                                  className="view-interview-details-btn"
                                  style={{
                                    padding: "15px 20px",

                                    fontSize: "13px",

                                    whiteSpace: "nowrap",

                                    height: "28px",

                                    minWidth: "60px",

                                    display: "flex",

                                    alignItems: "center",

                                    justifyContent: "center",
                                  }}
                                >
                                  View Details
                                </Button>
                              </>
                            )}
                          </div>

                          {activeTab === "Offered" && (
                            <>
                              <div
                                className="vr-sep"
                                style={{
                                  borderLeft: "1px solid rgba(0,0,0,0.12)",
                                  height: "24px",
                                }}
                              ></div>

                              <Button
                                variant={
                                  isOfferSent(applicant.id)
                                    ? "outline-secondary"
                                    : "outline-primary"
                                }
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(applicant);
                                }}
                                className="view-interview-details-btn"
                                style={{
                                  padding: "15px 20px",

                                  fontSize: "13px",

                                  whiteSpace: "nowrap",

                                  height: "28px",

                                  minWidth: "60px",

                                  display: "flex",

                                  alignItems: "center",

                                  justifyContent: "center",
                                }}
                                disabled={isOfferSent(applicant.id)}
                              >
                                {isOfferSent(applicant.id)
                                  ? "Offer Sent"
                                  : "Send Offer"}
                              </Button>
                            </>
                          )}

                          {activeTab === "Accepted Offer" && (
                            <>
                              <div
                                className="vr-sep"
                                style={{
                                  borderLeft: "1px solid rgba(0,0,0,0.12)",

                                  height: "24px",

                                  marginLeft: "8px",
                                }}
                              ></div>

                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();

                                  handleViewDetails(applicant);
                                }}
                                className="view-details-btn"
                                style={{
                                  padding: "8px 16px",

                                  fontSize: "13px",

                                  whiteSpace: "nowrap",

                                  height: "32px",

                                  minWidth: "110px",

                                  display: "flex",

                                  alignItems: "center",

                                  justifyContent: "center",
                                }}
                              >
                                View Details
                              </Button>
                            </>
                          )}

                          {activeTab !== "Overview" &&
                            activeTab !== "Pending" &&
                            activeTab !== "Shortlisted" &&
                            activeTab !== "Interview" &&
                            activeTab !== "Offered" &&
                            activeTab !== "Accepted Offer" &&
                            activeTab !== "Onboarding" && (
                              <div className="ms-2 position-relative d-flex align-items-center">
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleDropdown(applicant.id);
                                  }}
                                  className="dropdown-toggle-btn"
                                >
                                  <FontAwesomeIcon icon={faEllipsisV} />
                                </Button>

                                {activeDropdown === applicant.id && (
                                  <div className="dropdown-menu show">
                                    <button
                                      className="dropdown-item"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewDetails(applicant);
                                      }}
                                    >
                                      <FontAwesomeIcon
                                        icon={faEye}
                                        className="me-2"
                                      />
                                      View Details
                                    </button>

                                    <button
                                      className="dropdown-item"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleChangeStatus(applicant);
                                      }}
                                    >
                                      <FontAwesomeIcon
                                        icon={faEdit}
                                        className="me-2"
                                      />
                                      Change Status
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                      </div>

                      {activeTab !== "Overview" &&
                        activeTab !== "Onboarding" &&
                        expandedRowId === applicant.id && (
                          <div
                            className="card-expand mt-2 pt-2"
                            style={{ borderTop: "1px dashed rgba(0,0,0,0.1)" }}
                          >
                            <div className="expanded-content">
                              <div
                                className="expanded-title"
                                style={{
                                  fontSize: "0.85rem",
                                  color: "#6c757d",
                                }}
                              >
                                Applied Date
                              </div>

                              <div
                                className="expanded-value"
                                style={{ fontWeight: 600 }}
                              >
                                {applicant.applied_at
                                  ? new Date(
                                      applicant.applied_at
                                    ).toLocaleDateString()
                                  : "N/A"}

                                {applicant.applied_at && (
                                  <span
                                    className="expanded-time"
                                    style={{
                                      fontWeight: 400,
                                      color: "#6c757d",
                                    }}
                                  >
                                    {` • ${new Date(
                                      applicant.applied_at
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </Col>
      </Row>

      {/* Applicant Details Modal */}

      {showModal && selectedRecord && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content applicant-details-modal">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Applicant Details</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>

              <div className="modal-body px-4 py-3">
                <div className="applicant-details-content">
                  {/* Applicant Info */}

                  <div className="detail-section mb-4">
                    <div className="d-flex align-items-center mb-3">
                      <div className="avatar-large me-3">
                        {selectedRecord.applicant?.first_name
                          ? selectedRecord.applicant.first_name
                              .charAt(0)
                              .toUpperCase()
                          : "A"}
                      </div>

                      <div>
                        <h4 className="mb-1 fw-bold">
                          {selectedRecord.applicant
                            ? `${selectedRecord.applicant.first_name || ""} ${
                                selectedRecord.applicant.last_name || ""
                              }`.trim()
                            : "N/A"}
                        </h4>

                        <p className="text-muted mb-0">
                          <FontAwesomeIcon icon={faEnvelope} className="me-2" />

                          {selectedRecord.applicant?.email || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Application Details */}

                  <div className="detail-section mb-4">
                    <h6 className="section-title mb-3">Application Details</h6>

                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <div className="info-item">
                          <span className="label">Position:</span>

                          <span className="value fw-semibold">
                            {selectedRecord.jobPosting?.position ||
                              selectedRecord.job_posting?.position ||
                              "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="col-md-6 mb-2">
                        <div className="info-item">
                          <span className="label">Department:</span>

                          <span className="value fw-semibold">
                            {selectedRecord.jobPosting?.department ||
                              selectedRecord.job_posting?.department ||
                              "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="col-md-6 mb-2">
                        <div className="info-item">
                          <span className="label">Applied Date:</span>

                          <span className="value">
                            {selectedRecord.applied_at
                              ? new Date(
                                  selectedRecord.applied_at
                                ).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="col-md-6 mb-2">
                        <div className="info-item">
                          <span className="label">Status:</span>

                          <span className="value">
                            {getStatusBadge(selectedRecord.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resume Section */}

                  <div className="detail-section mb-4">
                    <h6 className="section-title mb-3">Resume</h6>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleViewResume(selectedRecord)}
                      className="view-resume-btn"
                    >
                      <FontAwesomeIcon icon={faEye} className="me-2" />
                      View Resume
                    </Button>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Show for Pending and Accepted Offer status */}

              {selectedRecord.status === "Pending" && (
                <div className="modal-footer border-0 pt-0 px-4 pb-4">
                  <div className="d-flex gap-3 w-100">
                    <Button
                      variant="success"
                      className="flex-fill action-btn"
                      onClick={() => handleStatusUpdate("ShortListed")}
                    >
                      <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                      Move to Shortlisted
                    </Button>

                    <Button
                      variant="danger"
                      className="flex-fill action-btn"
                      onClick={() => handleStatusUpdate("Rejected")}
                    >
                      <FontAwesomeIcon icon={faTimesCircle} className="me-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {/* Start Onboarding Button for Accepted Offer */}

              {(selectedRecord.status === "Offer Accepted" ||
                selectedRecord.status === "Accepted") && (
                <div className="modal-footer border-0 pt-0 px-4 pb-4">
                  <div className="d-flex gap-3 w-100">
                    <Button
                      variant="secondary"
                      onClick={() => setShowModal(false)}
                      style={{ flex: "0 0 auto" }}
                    >
                      Close
                    </Button>

                    <Button
                      variant="success"
                      className="flex-fill action-btn"
                      onClick={() => {
                        setShowStartOnboardingModal(true);
                      }}
                    >
                      <FontAwesomeIcon icon={faUserTie} className="me-2" />
                      Start Onboarding
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Start Onboarding Confirmation Modal */}

      {showStartOnboardingModal && selectedRecord && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  <FontAwesomeIcon
                    icon={faUserTie}
                    className="me-2 text-primary"
                  />
                  Start Onboarding
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowStartOnboardingModal(false)}
                ></button>
              </div>

              <div className="modal-body px-4 py-3">
                <p className="mb-0">
                  Are you sure you want to start onboarding for{" "}
                  <strong>
                    {selectedRecord.applicant
                      ? `${selectedRecord.applicant.first_name || ""} ${
                          selectedRecord.applicant.last_name || ""
                        }`.trim()
                      : "this applicant"}
                  </strong>
                  ?
                </p>

                <p className="text-muted small mt-2 mb-0">
                  This will change their status to "Onboarding" and move them to
                  the Onboarding tab.
                </p>
              </div>

              <div className="modal-footer border-0 pt-0 px-4 pb-4">
                <div className="d-flex gap-3 w-100">
                  <Button
                    variant="secondary"
                    onClick={() => setShowStartOnboardingModal(false)}
                    style={{ flex: "0 0 auto" }}
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="success"
                    className="flex-fill action-btn"
                    onClick={handleConfirmStartOnboarding}
                  >
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                    Confirm
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interview Schedule Modal */}

      {showInterviewModal && selectedApplicantForInterview && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Schedule Interview</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowInterviewModal(false);

                    setSelectedApplicantForInterview(null);
                  }}
                ></button>
              </div>

              <div className="modal-body px-4 py-3">
                {/* Applicant Info */}

                <div className="mb-4 p-3 bg-light rounded">
                  <h6 className="fw-bold mb-2">Applicant Information</h6>

                  <div className="d-flex align-items-center">
                    <div className="avatar me-3">
                      {selectedApplicantForInterview.applicant?.first_name
                        ? selectedApplicantForInterview.applicant.first_name
                            .charAt(0)
                            .toUpperCase()
                        : "A"}
                    </div>

                    <div>
                      <div className="fw-semibold">
                        {selectedApplicantForInterview.applicant
                          ? `${
                              selectedApplicantForInterview.applicant
                                .first_name || ""
                            } ${
                              selectedApplicantForInterview.applicant
                                .last_name || ""
                            }`.trim()
                          : "N/A"}
                      </div>

                      <div className="text-muted small">
                        {selectedApplicantForInterview.applicant?.email ||
                          "N/A"}
                      </div>

                      <div className="text-muted small">
                        Position:{" "}
                        {selectedApplicantForInterview.jobPosting?.position ||
                          selectedApplicantForInterview.job_posting?.position ||
                          "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interview Details Form */}

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Interview Date <span className="text-danger">*</span>
                    </label>

                    <input
                      type="date"
                      className="form-control"
                      value={interviewData.interview_date}
                      onChange={(e) =>
                        setInterviewData({
                          ...interviewData,
                          interview_date: e.target.value,
                        })
                      }
                      min={new Date().toISOString().split("T")[0]}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Interview Time <span className="text-danger">*</span>
                    </label>

                    <div className="d-flex gap-2">
                      <select
                        className="form-control"
                        value={
                          parseTime12Hour(interviewData.interview_time).hour
                        }
                        onChange={(e) => {
                          const { minute, ampm } = parseTime12Hour(
                            interviewData.interview_time
                          );

                          setInterviewData({
                            ...interviewData,
                            interview_time: formatTime12Hour(
                              e.target.value,
                              minute,
                              ampm
                            ),
                          });
                        }}
                        required
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option
                            key={i}
                            value={(i + 1).toString().padStart(2, "0")}
                          >
                            {(i + 1).toString().padStart(2, "0")}
                          </option>
                        ))}
                      </select>

                      <span className="align-self-center">:</span>

                      <select
                        className="form-control"
                        value={
                          parseTime12Hour(interviewData.interview_time).minute
                        }
                        onChange={(e) => {
                          const { hour, ampm } = parseTime12Hour(
                            interviewData.interview_time
                          );

                          setInterviewData({
                            ...interviewData,
                            interview_time: formatTime12Hour(
                              hour,
                              e.target.value,
                              ampm
                            ),
                          });
                        }}
                        required
                      >
                        <option value="00">00</option>

                        <option value="10">10</option>

                        <option value="20">20</option>

                        <option value="30">30</option>

                        <option value="40">40</option>

                        <option value="50">50</option>
                      </select>

                      <select
                        className="form-control"
                        value={
                          parseTime12Hour(interviewData.interview_time).ampm
                        }
                        onChange={(e) => {
                          const { hour, minute } = parseTime12Hour(
                            interviewData.interview_time
                          );

                          setInterviewData({
                            ...interviewData,
                            interview_time: formatTime12Hour(
                              hour,
                              minute,
                              e.target.value
                            ),
                          });
                        }}
                        required
                      >
                        <option value="AM">AM</option>

                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      End Time <span className="text-danger">*</span>
                    </label>

                    <div className="d-flex gap-2">
                      <select
                        className="form-control"
                        value={parseTime12Hour(interviewData.end_time).hour}
                        onChange={(e) => {
                          const { minute, ampm } = parseTime12Hour(
                            interviewData.end_time
                          );

                          setInterviewData({
                            ...interviewData,
                            end_time: formatTime12Hour(
                              e.target.value,
                              minute,
                              ampm
                            ),
                          });
                        }}
                        required
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option
                            key={i}
                            value={(i + 1).toString().padStart(2, "0")}
                          >
                            {(i + 1).toString().padStart(2, "0")}
                          </option>
                        ))}
                      </select>

                      <span className="align-self-center">:</span>

                      <select
                        className="form-control"
                        value={parseTime12Hour(interviewData.end_time).minute}
                        onChange={(e) => {
                          const { hour, ampm } = parseTime12Hour(
                            interviewData.end_time
                          );

                          setInterviewData({
                            ...interviewData,
                            end_time: formatTime12Hour(
                              hour,
                              e.target.value,
                              ampm
                            ),
                          });
                        }}
                        required
                      >
                        <option value="00">00</option>

                        <option value="10">10</option>

                        <option value="20">20</option>

                        <option value="30">30</option>

                        <option value="40">40</option>

                        <option value="50">50</option>
                      </select>

                      <select
                        className="form-control"
                        value={parseTime12Hour(interviewData.end_time).ampm}
                        onChange={(e) => {
                          const { hour, minute } = parseTime12Hour(
                            interviewData.end_time
                          );

                          setInterviewData({
                            ...interviewData,
                            end_time: formatTime12Hour(
                              hour,
                              minute,
                              e.target.value
                            ),
                          });
                        }}
                        required
                      >
                        <option value="AM">AM</option>

                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Interview Type
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      value={interviewData.interview_type}
                      disabled
                      style={{ backgroundColor: "#e9ecef" }}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold">
                      Location <span className="text-danger">*</span>
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      value={interviewData.location}
                      onChange={(e) =>
                        setInterviewData({
                          ...interviewData,
                          location: e.target.value,
                        })
                      }
                      placeholder="Enter interview location"
                      required
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold">
                      Interviewer <span className="text-danger">*</span>
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      value={interviewData.interviewer}
                      onChange={(e) =>
                        setInterviewData({
                          ...interviewData,
                          interviewer: e.target.value,
                        })
                      }
                      placeholder="Enter interviewer name"
                      required
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold">
                      Notes / What to Bring
                    </label>

                    <textarea
                      className="form-control"
                      rows="4"
                      value={interviewData.notes}
                      onChange={(e) =>
                        setInterviewData({
                          ...interviewData,
                          notes: e.target.value,
                        })
                      }
                      placeholder="Add any additional notes or requirements (e.g., documents to bring, dress code, etc.)"
                    ></textarea>
                  </div>

                  {/* View Resume Button */}

                  <div className="col-12">
                    <div className="border-top pt-3">
                      <label className="form-label fw-semibold">
                        Applicant Resume
                      </label>

                      <div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            handleViewResume(selectedApplicantForInterview)
                          }
                          className="view-resume-btn"
                        >
                          <FontAwesomeIcon icon={faEye} className="me-2" />
                          View Resume
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-0 px-4 pb-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowInterviewModal(false);

                    setSelectedApplicantForInterview(null);
                  }}
                >
                  Cancel
                </Button>

                <Button
                  variant="success"
                  onClick={handleSendInterviewInvite}
                  className="px-4"
                >
                  <i className="bi bi-send me-2"></i>
                  Send Invite
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`



        .professional-navbar {



          display: flex;



          flex-wrap: nowrap;



          gap: 0.4rem;



          justify-content: center;



          align-items: center;



          background: transparent;



          border-radius: 0;



          padding: 0;



          box-shadow: none;



          border: none;



          overflow-x: auto;



          overflow-y: hidden;



          min-height: auto;



        }







        .nav-tab {



          display: flex;



          align-items: center;



          padding: 0.55rem 0.75rem;



          border: 2px solid #e9ecef;



          background: white;



          color: #495057;



          border-radius: 8px;



          font-weight: 600;



          font-size: 0.8rem;



          transition: all 0.3s ease;



          text-decoration: none;



          flex: 0 0 auto;



          justify-content: center;



          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);



          min-width: 85px;



          white-space: nowrap;



          position: relative;



        }







        .nav-tab:hover {



          background: #e9ecef;



          border-color: #6c757d;



          color: #495057;



          transform: translateY(-2px);



          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);



        }







        .nav-tab.active {



          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);



          border-color: #667eea;



          color: white;



          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);



        }







        .nav-tab.active .badge {



          background: rgba(255, 255, 255, 0.2) !important;



          color: white !important;



        }







        .nav-tab .badge {



          margin-left: 0.5rem;



          font-size: 0.75rem;



          padding: 0.25rem 0.5rem;



          border-radius: 12px;



          font-weight: 600;



          min-width: 20px;



          text-align: center;



        }







        .content-section {



          background: transparent;



          border-radius: 0;



          padding: 0;



          box-shadow: none;



          border: none;



        }







        .modern-table-container {



          background: #ffffff;



          border-radius: 16px;



          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);



          overflow: hidden;



          border: 1px solid #e8e8e8;



          max-height: calc(100vh - 250px);



          overflow-y: auto;



          overflow-x: hidden;



          width: 100%;



          margin: 0;



        }



        



        /* Responsive design - Simplified */



        @media (max-width: 768px) {



          .modern-onboarding-table th,



          .modern-onboarding-table td {



            padding: 0.5rem 0.25rem;



            font-size: 0.85rem;



          }



        }







        .modern-onboarding-table {



          margin: 0;



          width: 100%;



          table-layout: fixed;



          max-width: 100%;



          border-collapse: separate;



          border-spacing: 0;



        }



        



        /* Column Widths - Responsive and balanced */



        .modern-onboarding-table th:nth-child(1),



        .modern-onboarding-table td:nth-child(1) { width: 28%; }



        .modern-onboarding-table th:nth-child(2),



        .modern-onboarding-table td:nth-child(2) { width: 12%; }



        .modern-onboarding-table th:nth-child(3),



        .modern-onboarding-table td:nth-child(3) { width: 14%; }



        .modern-onboarding-table th:nth-child(4),



        .modern-onboarding-table td:nth-child(4) { width: 13%; }



        .modern-onboarding-table th:nth-child(5),



        .modern-onboarding-table td:nth-child(5) { width: 11%; }



        .modern-onboarding-table th:nth-child(6),



        .modern-onboarding-table td:nth-child(6) { width: 22%; }







        .modern-onboarding-table thead th {



          background: #fafbfc;



          color: #6c757d;



          font-weight: 600;



          padding: 0.875rem 0.75rem;



          border-bottom: 2px solid #e0e0e0;



          font-size: 0.7rem;



          text-transform: uppercase;



          letter-spacing: 0.5px;



          white-space: nowrap;



          overflow: hidden;



          text-overflow: ellipsis;



        }







        .modern-onboarding-table tbody td {



          padding: 0.875rem 0.75rem;



          vertical-align: middle;



          border-bottom: 1px solid #f0f0f0;



          word-wrap: break-word;



          overflow-wrap: break-word;



          font-size: 0.85rem;



          background: #ffffff;



          overflow: hidden;



          text-overflow: ellipsis;



        }







        /* Alternating row colors */



        .modern-onboarding-table tbody tr:nth-child(even) {



          background-color: #fafbfc;



        }







        .modern-onboarding-table tbody tr:nth-child(even) td {



          background-color: #fafbfc;



        }



        



        /* Text Alignment */



        .align-left {



          text-align: left;



        }







        .align-center {



          text-align: center;



        }







        .align-right {



          text-align: right;



        }







        /* Applicant Cell */



        .applicant-cell {



          display: flex;



          align-items: center;



          gap: 0.75rem;



        }







        .applicant-info {



          display: flex;



          flex-direction: column;



          gap: 0.25rem;



        }







        .applicant-name {



          font-weight: 600;



          color: #2c3e50;



          font-size: 0.85rem;



          line-height: 1.3;



          overflow: hidden;



          text-overflow: ellipsis;



          white-space: nowrap;



        }







        .applicant-email {



          color: #9ca3af;



          font-size: 0.8rem;



          line-height: 1.3;



          overflow: hidden;



          text-overflow: ellipsis;



          white-space: nowrap;



        }







        /* Position and Department */



        .position-text {



          font-weight: 500;



          color: #495057;



          font-size: 0.85rem;



          white-space: nowrap;



          overflow: hidden;



          text-overflow: ellipsis;



          max-width: 100%;



        }







        .department-text {



          font-weight: 500;



          color: #495057;



          font-size: 0.85rem;



          white-space: nowrap;



          overflow: hidden;



          text-overflow: ellipsis;



          max-width: 100%;



        }







        .modern-onboarding-table tbody tr {



          transition: all 0.15s ease;



        }







        .modern-onboarding-table tbody tr:hover {



          background-color: #f5f7fa !important;



          transform: scale(1.001);



        }







        .modern-onboarding-table tbody tr:hover td {



          background-color: #f5f7fa !important;



        }







        /* Expanded row */



        .expanded-row td {



          background: #fbfcfe !important;



          border-top: none;



        }







        .expanded-content {



          padding: 0.75rem 1rem;



          display: flex;



          align-items: center;



          gap: 8px;



          color: #495057;



        }







        .expanded-title {



          font-weight: 600;



          color: #6c757d;



          margin-right: 6px;



        }







        .expanded-value {



          font-weight: 500;



        }







        .expanded-time {



          color: #9ca3af;



          margin-left: 6px;



        }







        .avatar {



          width: 36px;



          height: 36px;



          border-radius: 50%;



          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);



          color: white;



          display: flex;



          align-items: center;



          justify-content: center;



          font-weight: 600;



          font-size: 0.875rem;



          flex-shrink: 0;



        }







        .date-container {



          display: flex;



          flex-direction: column;



          gap: 0.2rem;



          align-items: center;



        }







        .date-text {



          font-size: 0.875rem;



          color: #495057;



          font-weight: 500;



          line-height: 1.3;



        }







        .time-text {



          font-size: 0.75rem;



          color: #9ca3af;



          line-height: 1.3;



        }







        .status-container {



          display: flex;



          justify-content: flex-end;



          align-items: center;



        }







        .dropdown-toggle-btn {



          border: 1px solid #e9ecef;



          background: #f8f9fa;



          color: #6c757d;



          border-radius: 8px;



          padding: 0.5rem 0.75rem;



          transition: all 0.2s ease;



        }







        .dropdown-toggle-btn:hover {



          background: #e9ecef;



          border-color: #6c757d;



          color: #495057;



        }







        .dropdown-menu {



          background: white;



          border: 1px solid #e9ecef;



          border-radius: 12px;



          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);



          padding: 0.5rem 0;



          min-width: 180px;



          z-index: 9999;



          position: absolute;



          top: calc(100% + 4px);



          right: 0;



        }







        .dropdown-item {



          padding: 0.75rem 1.25rem;



          font-size: 0.9rem;



          font-weight: 500;



          gap: 0.75rem;



          transition: all 0.2s ease;



        }







        .dropdown-item:hover {



          background-color: #f8f9fa;



          padding-left: 1.5rem;



        }







        .position-relative {



          position: relative;



        }







        .status-badge {



          font-size: 0.75rem;



          padding: 0.375rem 0.75rem;



          border-radius: 6px;



          font-weight: 600;



          border: none;



          display: inline-flex !important;



          align-items: center;



          gap: 0.375rem;



          white-space: nowrap;



        }







        .status-pending {



          background-color: #fff3cd !important;



          color: #856404 !important;



        }







        .status-shortlisted {



          background-color: #cfe2ff !important;



          color: #084298 !important;



        }







        .status-interview {



          background-color: #cfe2ff !important;



          color: #084298 !important;



        }







        .status-offered {



          background-color: #cfe2ff !important;



          color: #084298 !important;



        }







        .status-accepted {



          background-color: #d1e7dd !important;



          color: #0f5132 !important;



        }







        .status-onboarding {



          background-color: #cfe2ff !important;



          color: #084298 !important;



        }







        .status-hired {



          background-color: #d1e7dd !important;



          color: #0f5132 !important;



        }







        .status-rejected {



          background-color: #f8d7da !important;



          color: #842029 !important;



        }







        /* View Details Button */



        .view-details-btn {



          background-color: #ffffff !important;



          border: 1.5px solid #d1d5db !important;



          color: #4b5563 !important;



          font-size: 0.8125rem;



          padding: 0.65rem 1.5rem;



          border-radius: 6px;



          font-weight: 500;



          transition: all 0.2s ease;



          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);



          white-space: nowrap;



          line-height: 1.4;



          min-width: 110px;



        }







        .view-details-btn:hover {



          background-color: #f9fafb !important;



          border-color: #9ca3af !important;



          color: #374151 !important;



          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);



        }







        .view-details-btn:active {



          background-color: #f3f4f6 !important;



          transform: translateY(0);



        }







        /* Schedule Interview Button */



        .schedule-interview-btn {



          background-color: #28a745 !important;



          border-color: #28a745 !important;



          color: white !important;



          font-size: 0.85rem;



          padding: 0.75rem 1.75rem;



          border-radius: 6px;



          font-weight: 500;



          transition: all 0.2s ease;



          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);



          white-space: nowrap;



          line-height: 1.4;



          min-width: 170px;



        }







        .schedule-interview-btn:hover {



          background-color: #218838 !important;



          border-color: #1e7e34 !important;



          box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);



        }







        .schedule-interview-btn:active {



          background-color: #1e7e34 !important;



          transform: translateY(0);



        }







        /* Applicant Details Modal */



        .applicant-details-modal .modal-content {



          border-radius: 12px;



          border: none;



          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);



        }







        .applicant-details-content {



          font-size: 0.9rem;



        }







        .avatar-large {



          width: 60px;



          height: 60px;



          border-radius: 50%;



          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);



          color: white;



          display: flex;



          align-items: center;



          justify-content: center;



          font-weight: 600;



          font-size: 1.5rem;



        }







        .section-title {



          font-size: 0.875rem;



          font-weight: 600;



          color: #495057;



          text-transform: uppercase;



          letter-spacing: 0.5px;



          border-bottom: 2px solid #e9ecef;



          padding-bottom: 0.5rem;



        }







        .info-item {



          display: flex;



          align-items: center;



          gap: 0.5rem;



          padding: 0.4rem 0;



        }







        .info-item .label {



          font-weight: 500;



          color: #6c757d;



          min-width: 80px;



        }







        .info-item .value {



          color: #495057;



        }







        .view-resume-btn {



          border-radius: 6px;



          font-weight: 500;



          padding: 0.5rem 1.25rem;



          transition: all 0.2s ease;



          background-color: #4a90e2 !important;



          border-color: #4a90e2 !important;



        }







        .view-resume-btn:hover {



          transform: translateY(-1px);



          box-shadow: 0 2px 6px rgba(74, 144, 226, 0.3);



          background-color: #3a7bc8 !important;



          border-color: #3a7bc8 !important;



        }







        .download-resume-btn {



          border-radius: 6px;



          font-weight: 500;



          padding: 0.5rem 1.25rem;



          transition: all 0.2s ease;



        }







        .download-resume-btn:hover {



          transform: translateY(-1px);



          box-shadow: 0 2px 6px rgba(74, 144, 226, 0.2);



        }







        .action-btn {



          font-weight: 600;



          padding: 0.75rem 1.5rem;



          border-radius: 8px;



          font-size: 0.95rem;



          transition: all 0.2s ease;



          border: none;



        }







        .action-btn:hover {



          transform: translateY(-2px);



          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);



        }







        .detail-section {



          padding: 0.5rem 0;



        }







        @media (max-width: 1200px) {



          .professional-navbar {



            gap: 0.3rem;



            padding: 1rem;



          }







          .nav-tab {



            min-width: 100px;



            padding: 0.5rem 0.8rem;



            font-size: 0.8rem;



          }



        }







        @media (max-width: 768px) {



          .professional-navbar {



            flex-direction: column;



            gap: 0.5rem;



            padding: 1rem;



          }







          .nav-tab {



            width: 100%;



            min-width: auto;



            padding: 0.6rem 1rem;



            font-size: 0.85rem;



            justify-content: space-between;



          }



        }







        @media (max-width: 576px) {



          .nav-tab {



            font-size: 0.8rem;



            padding: 0.5rem 0.8rem;



          }







          .nav-tab .badge {



            font-size: 0.7rem;



            padding: 0.2rem 0.4rem;



          }



        }







        /* Overview header spacing: 5px between Applicant, Position, Department, Status */



        .overview-spacing thead th {



          position: relative;



        }







        .overview-spacing thead th.text-start + th.text-start,



        .overview-spacing thead th.text-start + th.text-center,



        .overview-spacing thead th.text-center + th.text-end {



          padding-left: calc(0.75rem + 5px);



        }







        .overview-spacing thead th.text-start:not(:first-child) {



          padding-left: calc(0.75rem + 5px);



        }







        .overview-spacing tbody td.align-left + td.align-left,



        .overview-spacing tbody td.align-left + td.align-center,



        .overview-spacing tbody td.align-center + td.align-right {



          padding-left: calc(0.75rem + 5px);



        }



      `}</style>

      {/* Batch Interview Modal */}

      {showBatchInterviewModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">
                  <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                  Schedule Batch Interview
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowBatchInterviewModal(false);

                    setBatchInterviewData({
                      interview_date: "",

                      interview_time: "",

                      interview_type: "On-site",

                      location: "",

                      interviewer: "",

                      notes: "",
                    });
                  }}
                ></button>
              </div>

              <div className="modal-body px-4 py-3">
                <div className="alert alert-info mb-4">
                  <FontAwesomeIcon icon={faUsers} className="me-2" />

                  <strong>
                    Selected Applicants ({selectedApplicants.length}):
                  </strong>

                  <ul className="mb-0 mt-2">
                    {selectedApplicants.map((applicant) => (
                      <li key={applicant.id}>
                        {applicant.applicant?.first_name}{" "}
                        {applicant.applicant?.last_name} -{" "}
                        {applicant.job_posting?.title}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">
                      Interview Date *
                    </label>

                    <input
                      type="date"
                      className="form-control"
                      value={batchInterviewData.interview_date}
                      onChange={(e) =>
                        setBatchInterviewData({
                          ...batchInterviewData,
                          interview_date: e.target.value,
                        })
                      }
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">
                      Interview Time *
                    </label>

                    <div className="d-flex gap-2">
                      <select
                        className="form-control"
                        value={
                          parseTime12Hour(batchInterviewData.interview_time)
                            .hour
                        }
                        onChange={(e) => {
                          const { minute, ampm } = parseTime12Hour(
                            batchInterviewData.interview_time
                          );

                          setBatchInterviewData({
                            ...batchInterviewData,
                            interview_time: formatTime12Hour(
                              e.target.value,
                              minute,
                              ampm
                            ),
                          });
                        }}
                        required
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option
                            key={i}
                            value={(i + 1).toString().padStart(2, "0")}
                          >
                            {(i + 1).toString().padStart(2, "0")}
                          </option>
                        ))}
                      </select>

                      <span className="align-self-center">:</span>

                      <select
                        className="form-control"
                        value={
                          parseTime12Hour(batchInterviewData.interview_time)
                            .minute
                        }
                        onChange={(e) => {
                          const { hour, ampm } = parseTime12Hour(
                            batchInterviewData.interview_time
                          );

                          setBatchInterviewData({
                            ...batchInterviewData,
                            interview_time: formatTime12Hour(
                              hour,
                              e.target.value,
                              ampm
                            ),
                          });
                        }}
                        required
                      >
                        <option value="00">00</option>

                        <option value="10">10</option>

                        <option value="20">20</option>

                        <option value="30">30</option>

                        <option value="40">40</option>

                        <option value="50">50</option>
                      </select>

                      <select
                        className="form-control"
                        value={
                          parseTime12Hour(batchInterviewData.interview_time)
                            .ampm
                        }
                        onChange={(e) => {
                          const { hour, minute } = parseTime12Hour(
                            batchInterviewData.interview_time
                          );

                          setBatchInterviewData({
                            ...batchInterviewData,
                            interview_time: formatTime12Hour(
                              hour,
                              minute,
                              e.target.value
                            ),
                          });
                        }}
                        required
                      >
                        <option value="AM">AM</option>

                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">End Time *</label>

                    <div className="d-flex gap-2">
                      <select
                        className="form-control"
                        value={
                          parseTime12Hour(batchInterviewData.end_time).hour
                        }
                        onChange={(e) => {
                          const { minute, ampm } = parseTime12Hour(
                            batchInterviewData.end_time
                          );

                          setBatchInterviewData({
                            ...batchInterviewData,
                            end_time: formatTime12Hour(
                              e.target.value,
                              minute,
                              ampm
                            ),
                          });
                        }}
                        required
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option
                            key={i}
                            value={(i + 1).toString().padStart(2, "0")}
                          >
                            {(i + 1).toString().padStart(2, "0")}
                          </option>
                        ))}
                      </select>

                      <span className="align-self-center">:</span>

                      <select
                        className="form-control"
                        value={
                          parseTime12Hour(batchInterviewData.end_time).minute
                        }
                        onChange={(e) => {
                          const { hour, ampm } = parseTime12Hour(
                            batchInterviewData.end_time
                          );

                          setBatchInterviewData({
                            ...batchInterviewData,
                            end_time: formatTime12Hour(
                              hour,
                              e.target.value,
                              ampm
                            ),
                          });
                        }}
                        required
                      >
                        <option value="00">00</option>

                        <option value="10">10</option>

                        <option value="20">20</option>

                        <option value="30">30</option>

                        <option value="40">40</option>

                        <option value="50">50</option>
                      </select>

                      <select
                        className="form-control"
                        value={
                          parseTime12Hour(batchInterviewData.end_time).ampm
                        }
                        onChange={(e) => {
                          const { hour, minute } = parseTime12Hour(
                            batchInterviewData.end_time
                          );

                          setBatchInterviewData({
                            ...batchInterviewData,
                            end_time: formatTime12Hour(
                              hour,
                              minute,
                              e.target.value
                            ),
                          });
                        }}
                        required
                      >
                        <option value="AM">AM</option>

                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">
                      Interview Type *
                    </label>

                    <select
                      className="form-select"
                      value={batchInterviewData.interview_type}
                      onChange={(e) =>
                        setBatchInterviewData({
                          ...batchInterviewData,
                          interview_type: e.target.value,
                        })
                      }
                    >
                      <option value="On-site">On-site</option>

                      <option value="in-person">In-person</option>

                      <option value="video">Video Call</option>

                      <option value="phone">Phone Call</option>

                      <option value="online">Online</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Location *</label>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter interview location"
                    value={batchInterviewData.location}
                    onChange={(e) =>
                      setBatchInterviewData({
                        ...batchInterviewData,
                        location: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Interviewer *
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter interviewer name"
                    value={batchInterviewData.interviewer}
                    onChange={(e) =>
                      setBatchInterviewData({
                        ...batchInterviewData,
                        interviewer: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Notes</label>

                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Enter any additional notes or instructions"
                    value={batchInterviewData.notes}
                    onChange={(e) =>
                      setBatchInterviewData({
                        ...batchInterviewData,
                        notes: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer border-0">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowBatchInterviewModal(false);

                    setBatchInterviewData({
                      interview_date: "",

                      interview_time: "",

                      end_time: "",

                      interview_type: "On-site",

                      location: "",

                      interviewer: "",

                      notes: "",
                    });
                  }}
                >
                  Cancel
                </Button>

                <Button
                  variant="success"
                  onClick={handleSendBatchInterviewInvites}
                  className="px-4"
                >
                  <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                  Send Batch Invites
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interview Details Modal */}

      {showInterviewDetailsModal && selectedInterviewDetails && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                  Interview Details -{" "}
                  {selectedInterviewDetails.applicant?.applicant?.first_name ||
                    "N/A"}{" "}
                  {selectedInterviewDetails.applicant?.applicant?.last_name ||
                    ""}
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowInterviewDetailsModal(false);

                    setSelectedInterviewDetails(null);
                  }}
                ></button>
              </div>

              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="fw-bold text-primary mb-3">
                      <FontAwesomeIcon icon={faUserTie} className="me-2" />
                      Applicant Information
                    </h6>

                    <div className="mb-2">
                      <strong>Name:</strong>{" "}
                      {selectedInterviewDetails.applicant?.applicant
                        ?.first_name || "N/A"}{" "}
                      {selectedInterviewDetails.applicant?.applicant
                        ?.last_name || ""}
                    </div>

                    <div className="mb-2">
                      <strong>Email:</strong>{" "}
                      {selectedInterviewDetails.applicant?.applicant?.email ||
                        "N/A"}
                    </div>

                    <div className="mb-2">
                      <strong>Position:</strong>{" "}
                      {selectedInterviewDetails.applicant?.jobPosting
                        ?.position ||
                        selectedInterviewDetails.applicant?.job_posting
                          ?.position ||
                        "N/A"}
                    </div>

                    <div className="mb-2">
                      <strong>Department:</strong>{" "}
                      {selectedInterviewDetails.applicant?.jobPosting
                        ?.department ||
                        selectedInterviewDetails.applicant?.job_posting
                          ?.department ||
                        "N/A"}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <h6 className="fw-bold text-primary mb-3">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                      Interview Information
                    </h6>

                    <div className="mb-2">
                      <strong>Date:</strong>{" "}
                      {selectedInterviewDetails.interview_date
                        ? new Date(
                            selectedInterviewDetails.interview_date
                          ).toLocaleDateString()
                        : "N/A"}
                    </div>

                    <div className="mb-2">
                      <strong>Start Time:</strong>{" "}
                      {selectedInterviewDetails.interview_time
                        ? new Date(
                            `2000-01-01T${selectedInterviewDetails.interview_time}`
                          ).toLocaleTimeString("en-PH", {
                            timeZone: "Asia/Manila",

                            hour: "2-digit",

                            minute: "2-digit",

                            hour12: true,
                          })
                        : "N/A"}
                    </div>

                    <div className="mb-2">
                      <strong>End Time:</strong>{" "}
                      {selectedInterviewDetails.end_time
                        ? new Date(
                            `2000-01-01T${selectedInterviewDetails.end_time}`
                          ).toLocaleTimeString("en-PH", {
                            timeZone: "Asia/Manila",

                            hour: "2-digit",

                            minute: "2-digit",

                            hour12: true,
                          })
                        : "N/A"}
                    </div>

                    <div className="mb-2">
                      <strong>Type:</strong>{" "}
                      {selectedInterviewDetails.interview_type || "N/A"}
                    </div>

                    <div className="mb-2">
                      <strong>Location:</strong>{" "}
                      {selectedInterviewDetails.location || "N/A"}
                    </div>

                    <div className="mb-2">
                      <strong>Interviewer:</strong>{" "}
                      {selectedInterviewDetails.interviewer || "N/A"}
                    </div>
                  </div>
                </div>

                {selectedInterviewDetails.notes && (
                  <div className="mt-4">
                    <h6 className="fw-bold text-primary mb-2">
                      <FontAwesomeIcon icon={faFileAlt} className="me-2" />
                      Additional Notes
                    </h6>

                    <div className="p-3 bg-light rounded">
                      {selectedInterviewDetails.notes}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowInterviewDetailsModal(false);

                    setSelectedInterviewDetails(null);
                  }}
                >
                  Close
                </Button>

                <Button
                  variant="danger"
                  onClick={() =>
                    handleRejectApplicant(selectedInterviewDetails.applicant)
                  }
                  className="ms-2"
                >
                  <FontAwesomeIcon icon={faTimesCircle} className="me-2" />
                  Reject
                </Button>

                {(() => {
                  const app = selectedInterviewDetails.applicant;

                  const offerLocked = [
                    "Offered",
                    "Offer Accepted",
                    "Hired",
                    "Rejected",
                  ].includes(app?.status);

                  return (
                    <Button
                      variant={offerLocked ? "outline-secondary" : "success"}
                      disabled={offerLocked}
                      onClick={() => {
                        if (!offerLocked) handleOfferJob(app);
                      }}
                      className="ms-2"
                    >
                      <FontAwesomeIcon icon={faCheckCircle} className="me-2" />

                      {offerLocked ? "Offer Sent" : "Offer Job"}
                    </Button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Offer Modal */}

      {showJobOfferModal && selectedRecord && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Send Job Offer</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowJobOfferModal(false);

                    setSelectedRecord(null);
                  }}
                ></button>
              </div>

              <div className="modal-body px-4 py-3">
                {/* Applicant Info */}

                <div className="mb-4 p-3 bg-light rounded">
                  <h6 className="fw-bold mb-2">Applicant Information</h6>

                  <div className="d-flex align-items-center">
                    <div className="avatar me-3">
                      {selectedRecord.applicant?.first_name
                        ? selectedRecord.applicant.first_name
                            .charAt(0)
                            .toUpperCase()
                        : "A"}
                    </div>

                    <div>
                      <div className="fw-semibold">
                        {selectedRecord.applicant
                          ? `${selectedRecord.applicant.first_name || ""} ${
                              selectedRecord.applicant.last_name || ""
                            }`.trim()
                          : "N/A"}
                      </div>

                      <div className="text-muted small">
                        {selectedRecord.applicant?.email || "N/A"}
                      </div>

                      <div className="text-muted small">
                        Position:{" "}
                        {selectedRecord.jobPosting?.position ||
                          selectedRecord.job_posting?.position ||
                          "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resume Section */}

                <div className="mb-4">
                  <h6 className="fw-bold mb-3">Resume</h6>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleViewResume(selectedRecord)}
                    className="view-resume-btn"
                  >
                    <FontAwesomeIcon icon={faEye} className="me-2" />
                    View Resume
                  </Button>
                </div>

                {/* Job Offer Form */}

                <div className="border-top pt-4">
                  <h6 className="fw-bold mb-3">Job Offer Details</h6>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Department
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        value={jobOfferData.department}
                        disabled
                        style={{ backgroundColor: "#e9ecef" }}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Position</label>

                      <input
                        type="text"
                        className="form-control"
                        value={jobOfferData.position}
                        disabled
                        style={{ backgroundColor: "#e9ecef" }}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">Salary</label>

                      <input
                        type="text"
                        className="form-control"
                        value={jobOfferData.salary}
                        disabled
                        style={{ backgroundColor: "#e9ecef" }}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Payment Schedule
                      </label>

                      <select
                        className="form-select"
                        value={jobOfferData.payment_schedule}
                        onChange={(e) =>
                          setJobOfferData({
                            ...jobOfferData,
                            payment_schedule: e.target.value,
                          })
                        }
                      >
                        <option value="Monthly">Monthly</option>

                        <option value="Weekly">Weekly</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Employment Type
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        value={jobOfferData.employment_type}
                        disabled
                        style={{ backgroundColor: "#e9ecef" }}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Work Setup
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        value={jobOfferData.work_setup}
                        disabled
                        style={{ backgroundColor: "#e9ecef" }}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Offer Validity
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        value={jobOfferData.offer_validity}
                        disabled
                        style={{ backgroundColor: "#e9ecef" }}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Contact Person <span className="text-danger">*</span>
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        value={jobOfferData.contact_person}
                        onChange={(e) =>
                          setJobOfferData({
                            ...jobOfferData,
                            contact_person: e.target.value,
                          })
                        }
                        placeholder="Enter contact person name"
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Contact Number <span className="text-danger">*</span>
                      </label>

                      <input
                        type="tel"
                        className="form-control"
                        value={jobOfferData.contact_number}
                        onChange={(e) =>
                          setJobOfferData({
                            ...jobOfferData,
                            contact_number: e.target.value,
                          })
                        }
                        placeholder="Enter contact number"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-0 px-4 pb-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowJobOfferModal(false);

                    setSelectedRecord(null);
                  }}
                >
                  Cancel
                </Button>

                <Button
                  variant={
                    ["Offered", "Offer Accepted", "Hired", "Rejected"].includes(
                      selectedRecord?.status
                    )
                      ? "secondary"
                      : "success"
                  }
                  onClick={handleSubmitJobOffer}
                  className="px-4"
                  disabled={[
                    "Offered",
                    "Offer Accepted",
                    "Hired",
                    "Rejected",
                  ].includes(selectedRecord?.status)}
                >
                  <FontAwesomeIcon icon={faFileAlt} className="me-2" />
                  Send Offer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Management Modal */}

      {showDocumentModal && selectedApplicationForDocs && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
        >
          <div
            className="modal-dialog modal-xl modal-dialog-centered"
            style={{ maxWidth: "1200px" }}
          >
            <div className="modal-content" style={{ borderRadius: "12px" }}>
              <div
                className="modal-header border-0 pb-2"
                style={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: "12px 12px 0 0",
                }}
              >
                <h5 className="modal-title fw-bold text-white">
                  <FontAwesomeIcon icon={faFilePdf} className="me-2" />
                  View / Verify Documents -{" "}
                  {selectedApplicationForDocs.applicant
                    ? `${
                        selectedApplicationForDocs.applicant.first_name || ""
                      } ${
                        selectedApplicationForDocs.applicant.last_name || ""
                      }`.trim()
                    : "Applicant"}
                </h5>

                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowDocumentModal(false);

                    setSelectedApplicationForDocs(null);

                    setDocumentRequirements([]);

                    setDocumentSubmissions([]);

                    setFollowUpRequests([]);

                    setFollowUpRequestsError("");
                  }}
                ></button>
              </div>

              <div className="modal-body p-4">
                {/* Tabs */}

                <div className="d-flex flex-wrap gap-2 mb-4 border-bottom">
                  {documentModalTabs.map((tab) => (
                    <Button
                      key={tab}
                      variant={
                        documentModalTab === tab
                          ? "primary"
                          : "outline-secondary"
                      }
                      size="sm"
                      onClick={() => setDocumentModalTab(tab)}
                      style={{
                        borderRadius: "8px 8px 0 0",
                        borderBottom: "none",
                      }}
                    >
                      {tab}
                    </Button>
                  ))}
                </div>

                <div>
                  {documentModalTab === "Applicant Identification" ? (
                    <>
                      {allDocumentsApproved() && (
                        <Alert variant="success" className="mb-4">
                          <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="me-2"
                          />
                          <strong>All required documents are approved!</strong>{" "}
                          You can now mark this step as complete.
                        </Alert>
                      )}

                      {renderDocumentCards(applicantIdentificationDocs)}
                    </>
                  ) : documentModalTab === "Government & Tax Documents" ? (
                    renderDocumentCards(governmentTaxDocs)
                  ) : documentModalTab === "Medical Documents" ? (
                    renderDocumentCards(medicalDocs)
                  ) : documentModalTab === "Additional Document" ? (
                    <>
                      <div className="card border-0 shadow-sm mb-4">
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-3">
                            <FontAwesomeIcon
                              icon={faPaperclip}
                              className="text-primary me-2"
                            />

                            <h6 className="fw-bold mb-0">
                              Request Additional Documents
                            </h6>
                          </div>

                          <p className="text-muted small mb-4">
                            Create a custom requirement to notify the applicant
                            and request the needed document.
                          </p>

                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">
                                Document Name{" "}
                                <span className="text-danger">*</span>
                              </label>

                              <input
                                type="text"
                                className="form-control"
                                value={newRequirement.document_name}
                                onChange={(e) =>
                                  setNewRequirement((prev) => ({
                                    ...prev,

                                    document_name: e.target.value,
                                  }))
                                }
                                placeholder="e.g., Portfolio, Certification, Contract"
                              />
                            </div>

                            <div className="col-md-6">
                              <label className="form-label fw-semibold">
                                File Format
                              </label>

                              <input
                                type="text"
                                className="form-control"
                                value={newRequirement.file_format}
                                readOnly
                                style={{
                                  backgroundColor: "#f8f9fa",
                                  cursor: "not-allowed",
                                }}
                              />
                            </div>

                            <div className="col-12">
                              <label className="form-label fw-semibold">
                                Description / Instructions
                              </label>

                              <textarea
                                className="form-control"
                                rows="3"
                                value={newRequirement.description}
                                onChange={(e) =>
                                  setNewRequirement((prev) => ({
                                    ...prev,

                                    description: e.target.value,
                                  }))
                                }
                                placeholder="Provide details or instructions for the applicant."
                              ></textarea>
                            </div>

                            <div className="col-md-4">
                              <label className="form-label fw-semibold">
                                Max File Size (MB)
                              </label>

                              <input
                                type="number"
                                min="1"
                                className="form-control"
                                value={newRequirement.max_file_size_mb}
                                readOnly
                                style={{
                                  backgroundColor: "#f8f9fa",
                                  cursor: "not-allowed",
                                }}
                              />
                            </div>

                            <div className="col-md-8 d-flex align-items-center">
                              <div className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id="assistant-additional-doc-required"
                                  checked={newRequirement.is_required}
                                  onChange={(e) =>
                                    setNewRequirement((prev) => ({
                                      ...prev,

                                      is_required: e.target.checked,
                                    }))
                                  }
                                />

                                <label
                                  className="form-check-label"
                                  htmlFor="assistant-additional-doc-required"
                                >
                                  Mark as required (applicant must upload)
                                </label>
                              </div>
                            </div>
                          </div>

                          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mt-4 gap-3">
                            <span className="text-muted small">
                              The applicant will be notified to upload this
                              document once you send the request.
                            </span>

                            <Button
                              variant="primary"
                              className="px-3"
                              onClick={createDocumentRequirement}
                              disabled={!newRequirement.document_name.trim()}
                            >
                              <FontAwesomeIcon icon={faPlus} className="me-2" />
                              Send Request to Applicant
                            </Button>
                          </div>
                        </div>
                      </div>

                      {additionalRequirementDocs.length > 0 ? (
                        renderDocumentCards(additionalRequirementDocs)
                      ) : (
                        <div className="card border-0 shadow-sm">
                          <div className="card-body text-center py-4 text-muted small">
                            Any additional document requests you send to the
                            applicant will appear here for review once they
                            submit them.
                          </div>
                        </div>
                      )}
                    </>
                  ) : documentModalTab === "Follow-Up Requests" ? (
                    <>
                      <div className="card border-0 shadow-sm mb-4">
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-3">
                            <FontAwesomeIcon
                              icon={faEnvelope}
                              className="text-primary me-2"
                            />

                            <h6 className="fw-bold mb-0">Follow-Up Requests</h6>
                          </div>

                          <p className="text-muted small mb-4">
                            Review follow-up messages and supporting files sent
                            by applicants after their initial submissions.
                          </p>

                          {followUpRequestsError ? (
                            <Alert variant="danger" className="mb-3">
                              {followUpRequestsError}
                            </Alert>
                          ) : null}

                          {loadingFollowUpRequests ? (
                            <div className="text-center text-muted py-5">
                              Loading follow-up requests...
                            </div>
                          ) : followUpRequests.length > 0 ? (
                            <div className="table-responsive">
                              <Table hover className="align-middle">
                                <thead className="table-light">
                                  <tr>
                                    <th>Applicant Name</th>

                                    <th>Document Type</th>

                                    <th>Date &amp; Time Sent</th>

                                    <th>Actions</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {followUpRequests.map((request) => {
                                    const statusVariant =
                                      getFollowUpStatusVariant(request.status);
                                    const statusLower =
                                      (request.status || "").toLowerCase();
                                    const extensionDeadlineDisplay =
                                      request.extensionDeadline
                                        ? formatDateTime(
                                            request.extensionDeadline
                                          )
                                        : null;

                                    return (
                                      <tr key={request.id}>
                                        <td>
                                          <div className="fw-semibold">
                                            {request.applicantName ||
                                              "Applicant"}
                                          </div>
                                        </td>

                                        <td>{request.documentType || "—"}</td>

                                        <td>
                                          {formatDateTime(request.sentAt)}
                                        </td>

                                        <td>
                                          <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() =>
                                              handleOpenFollowUpModal(request)
                                            }
                                          >
                                            <FontAwesomeIcon
                                              icon={faEye}
                                              className="me-2"
                                            />
                                            View
                                          </Button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </Table>
                            </div>
                          ) : (
                            <div className="text-center text-muted py-5">
                              <FontAwesomeIcon
                                icon={faEnvelope}
                                size="3x"
                                className="mb-3"
                              />

                              <h5 className="fw-semibold">
                                No follow-up requests yet
                              </h5>

                              <p className="mb-0 small">
                                Applicants can submit follow-ups when they need
                                to clarify or update their documents.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="card border-0 shadow-sm">
                      <div className="card-body text-center py-5">
                        <FontAwesomeIcon
                          icon={faFileAlt}
                          size="3x"
                          className="text-muted mb-3"
                        />

                        <h5 className="text-muted mb-2">{documentModalTab}</h5>

                        <p className="text-muted mb-0">
                          Documentation management for this category will be
                          available soon.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {approveModalData && (
                  <Modal
                    show
                    onHide={closeApproveModal}
                    centered
                    backdrop="static"
                  >
                    <Modal.Header
                      closeButton={!reviewingDocument}
                      className="border-0"
                    >
                      <Modal.Title className="fw-bold">
                        <FontAwesomeIcon
                          icon={faCheckCircle}
                          className="me-2 text-success"
                        />
                        Approve Document
                      </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                      <p className="mb-0">
                        Are you sure you want to approve{" "}
                        <strong>{approveModalData.documentTitle}</strong>?
                      </p>
                    </Modal.Body>
                    <Modal.Footer className="border-0">
                      <Button
                        variant="secondary"
                        onClick={closeApproveModal}
                        disabled={reviewingDocument}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="success"
                        onClick={confirmApproveDocument}
                        disabled={reviewingDocument}
                      >
                        {reviewingDocument ? "Approving..." : "Approve"}
                      </Button>
                    </Modal.Footer>
                  </Modal>
                )}

                {rejectingSubmissionId && (
                  <div
                    className="modal show d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: "rgba(0,0,0,0.3)", zIndex: 1060 }}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        setRejectingSubmissionId(null);

                        setRejectingDocumentKey(null);

                        setRejectionReason("");
                      }
                    }}
                  >
                    <div className="modal-dialog modal-dialog-centered">
                      <div
                        className="modal-content"
                        style={{ borderRadius: "12px" }}
                      >
                        <div className="modal-header border-0">
                          <h5 className="modal-title fw-bold">
                            <FontAwesomeIcon
                              icon={faTimesCircle}
                              className="me-2 text-danger"
                            />
                            Reject Document
                          </h5>

                          <button
                            type="button"
                            className="btn-close"
                            onClick={() => {
                              setRejectingSubmissionId(null);

                              setRejectingDocumentKey(null);

                              setRejectionReason("");
                            }}
                          ></button>
                        </div>

                        <div className="modal-body">
                          <p className="mb-3">
                            Please provide a reason for rejecting this document.
                            The employee will be notified to re-upload.
                          </p>

                          <label className="form-label fw-semibold">
                            Rejection Reason *
                          </label>

                          <textarea
                            className="form-control"
                            rows="3"
                            placeholder="e.g., Blurry photo, please re-upload"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            style={{ minHeight: "100px" }}
                          />
                        </div>

                        <div className="modal-footer border-0">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setRejectingSubmissionId(null);

                              setRejectingDocumentKey(null);

                              setRejectionReason("");
                            }}
                          >
                            Cancel
                          </Button>

                          <Button
                            variant="danger"
                            onClick={confirmRejectDocument}
                            disabled={
                              !rejectionReason.trim() || reviewingDocument
                            }
                          >
                            {reviewingDocument
                              ? "Processing..."
                              : "Confirm Rejection"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer border-0 d-flex justify-content-between">
                <div className="d-flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowDocumentModal(false);

                      setSelectedApplicationForDocs(null);

                      setDocumentRequirements([]);

                      setDocumentSubmissions([]);
                    }}
                  >
                    Close
                  </Button>

                  {allDocumentsApproved() && (
                    <Button
                      variant="success"
                      onClick={markDocumentSubmissionAsDone}
                    >
                      <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                      Mark as Done
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        show={showFollowUpModal}
        onHide={handleCloseFollowUpModal}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faEnvelope} className="me-2 text-primary" />
            {followUpActionType === "accept"
              ? "Accept Follow-Up Request"
              : followUpActionType === "reject"
              ? "Reject Follow-Up Request"
              : "Follow-Up Request"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedFollowUpRequest ? (
            <>
              <div className="mb-3">
                <div className="fw-semibold">
                  {selectedFollowUpRequest.applicantName || "Applicant"}
                </div>
                <div className="text-muted small">
                  Document: {selectedFollowUpRequest.documentType || "Document"}
                </div>
                <div className="text-muted small">
                  Submitted:{" "}
                  {selectedFollowUpRequest.sentAt
                    ? formatDateTime(selectedFollowUpRequest.sentAt)
                    : "N/A"}
                </div>
                <div className="text-muted small">
                  Status: {selectedFollowUpRequest.status || "Pending"}
                </div>
              </div>

              <div className="mb-3">
                <h6 className="fw-semibold">Applicant Message</h6>
                <div className="bg-light p-3 rounded small">
                  {selectedFollowUpRequest.message || "No message provided."}
                </div>
              </div>

              {selectedFollowUpRequest.attachmentUrl && (
                <div className="mb-3">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() =>
                      handleOpenFollowUpAttachment(selectedFollowUpRequest)
                    }
                  >
                    <FontAwesomeIcon icon={faExternalLinkAlt} className="me-2" />
                    View Attachment
                  </Button>
                  {selectedFollowUpRequest.attachmentName && (
                    <div className="text-muted small mt-2">
                      {selectedFollowUpRequest.attachmentName}
                    </div>
                  )}
                </div>
              )}

              {selectedFollowUpRequest.status &&
                selectedFollowUpRequest.status.toLowerCase() !== "pending" && (
                  <Alert
                    variant={
                      selectedFollowUpRequest.status.toLowerCase() === "accepted"
                        ? "success"
                        : "danger"
                    }
                  >
                    <div className="fw-semibold mb-1">
                      {selectedFollowUpRequest.status.toLowerCase() === "accepted"
                        ? "Follow-up Approved"
                        : "Follow-up Not Approved"}
                    </div>
                    {selectedFollowUpRequest.extensionDeadline &&
                      selectedFollowUpRequest.status.toLowerCase() ===
                        "accepted" && (
                        <div className="small text-muted">
                          Extension until{" "}
                          {formatDateTime(selectedFollowUpRequest.extensionDeadline)}
                        </div>
                      )}
                    {selectedFollowUpRequest.hrResponse && (
                      <div className="small mt-2">
                        HR Response: {selectedFollowUpRequest.hrResponse}
                      </div>
                    )}
                  </Alert>
                )}

              {selectedFollowUpRequest.status?.toLowerCase() === "pending" &&
                !followUpActionType && (
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    <Button
                      variant="success"
                      onClick={() => setFollowUpActionType("accept")}
                    >
                      <FontAwesomeIcon icon={faCheck} className="me-2" />
                      Accept Request
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setFollowUpActionType("reject")}
                    >
                      <FontAwesomeIcon icon={faTimes} className="me-2" />
                      Reject Request
                    </Button>
                  </div>
                )}

              {followUpActionType === "accept" && (
                <Form>
                  <Form.Group controlId="followUpExtensionDays">
                    <Form.Label>Extension Duration (days)</Form.Label>
                    <Form.Control
                      type="number"
                      min={1}
                      value={followUpActionForm.extensionDays}
                      onChange={(event) =>
                        handleFollowUpActionInputChange(
                          "extensionDays",
                          event.target.value
                        )
                      }
                    />
                    <Form.Text className="text-muted">
                      Specify how many additional day(s) the applicant will have
                      to resubmit this document.
                    </Form.Text>
                  </Form.Group>
                  <Form.Group controlId="followUpHrResponse" className="mt-3">
                    <Form.Label>Message to Applicant (optional)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={followUpActionForm.hrResponse}
                      onChange={(event) =>
                        handleFollowUpActionInputChange(
                          "hrResponse",
                          event.target.value
                        )
                      }
                      placeholder="Provide additional guidance or clarification."
                    />
                  </Form.Group>
                </Form>
              )}

              {followUpActionType === "reject" && (
                <Form>
                  <Form.Group controlId="followUpHrResponseReject">
                    <Form.Label>Message to Applicant (optional)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={followUpActionForm.hrResponse}
                      onChange={(event) =>
                        handleFollowUpActionInputChange(
                          "hrResponse",
                          event.target.value
                        )
                      }
                      placeholder="Let the applicant know why the request was rejected."
                    />
                  </Form.Group>
                </Form>
              )}
            </>
          ) : (
            <div className="text-muted">No follow-up request selected.</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseFollowUpModal}>
            Close
          </Button>
          {followUpActionType &&
            selectedFollowUpRequest?.status?.toLowerCase() === "pending" && (
              <Button
                variant={
                  followUpActionType === "accept" ? "success" : "danger"
                }
                onClick={handleSubmitFollowUpAction}
                disabled={followUpActionLoading}
              >
                {followUpActionLoading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Processing...
                  </>
                ) : followUpActionType === "accept" ? (
                  "Confirm Acceptance"
                ) : (
                  "Confirm Rejection"
                )}
              </Button>
            )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default OnboardingDashboard;
