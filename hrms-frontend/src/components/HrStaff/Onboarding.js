import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

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
  faEnvelope,
  faTimes,
  faRefresh,
  faEllipsisV,
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
  faSearch,
  faReply,
  faCheck,
  faExternalLinkAlt,
  faMapMarkerAlt,
  faBuilding,
  faLightbulb,
} from "@fortawesome/free-solid-svg-icons";

import axios from "axios";

const PROFILE_CREATION_QUEUE_STORAGE_KEY = "hrStaffProfileCreationQueue";

const createBenefitsEnrollmentForm = () => ({
  sssNumber: "",
  philhealthNumber: "",
  pagibigNumber: "",
  tinNumber: "",
  enrollmentDate: "",
  membershipProof: null,
  membershipProofName: "",
});

const COMPANY_EMAIL_DOMAIN = "company.com";

const createEmptyProfileForm = () => ({
  fullName: "",
  nickname: "",
  civilStatus: "",
  gender: "",
  dateOfBirth: "",
  age: "",
  phoneNumber: "",
  companyEmail: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  province: "",
  barangay: "",
  city: "",
  postalCode: "",
  presentAddress: "",
  position: "",
  department: "",
  employmentStatus: "",
  dateStarted: "",
  salary: "",
  tenure: "",
  sss: "",
  philhealth: "",
  pagibig: "",
  tin: "",
  profilePhotoUrl: "",
});

const calculateAgeFromDateOfBirth = (dateString) => {
  if (!dateString) {
    return "";
  }

  const birthDate = new Date(dateString);
  if (Number.isNaN(birthDate.getTime())) {
    return "";
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();

  const monthDifference = today.getMonth() - birthDate.getMonth();
  const hasNotHadBirthdayThisYear =
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate());

  if (hasNotHadBirthdayThisYear) {
    age -= 1;
  }

  return age >= 0 ? String(age) : "";
};

const resolveProfileFullName = (entry, profileData = {}) => {
  const trimValue = (value) => (typeof value === "string" ? value.trim() : "");

  const profileFullName = trimValue(profileData.fullName);
  if (profileFullName) {
    return profileFullName;
  }

  const profileFirstLast = [
    trimValue(profileData.firstName),
    trimValue(profileData.lastName),
  ]
    .filter(Boolean)
    .join(" ");
  if (profileFirstLast) {
    return profileFirstLast;
  }

  const entryName = trimValue(entry?.name);
  if (entryName) {
    return entryName;
  }

  const entryFirstLast = [
    trimValue(entry?.firstName || entry?.first_name),
    trimValue(entry?.lastName || entry?.last_name),
  ]
    .filter(Boolean)
    .join(" ");
  if (entryFirstLast) {
    return entryFirstLast;
  }

  const applicantFirstLast = [
    trimValue(entry?.applicant?.first_name),
    trimValue(entry?.applicant?.last_name),
  ]
    .filter(Boolean)
    .join(" ");
  if (applicantFirstLast) {
    return applicantFirstLast;
  }

  const applicantFullName = trimValue(
    entry?.applicant?.name || entry?.applicant?.full_name
  );
  if (applicantFullName) {
    return applicantFullName;
  }

  return "";
};

const calculateAgeFromBirthdate = (birthDateValue) => {
  if (!birthDateValue) {
    return "";
  }

  const birthDate = new Date(birthDateValue);
  if (Number.isNaN(birthDate.getTime())) {
    return "";
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() >= birthDate.getDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age >= 0 ? String(age) : "";
};

const Onboarding = () => {
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

  stage: "general",
  });

  const [onboardingSubtab, setOnboardingSubtab] = useState(
    "Document Submission"
  );

  // Onboarding management tabs

  const onboardingTabs = [
    "Document Submission",
    "Benefits Enroll",
    "Profile Creation",
    "Orientation Schedule",
    "Start Date",
  ];

  const onboardingTabDescriptions = {
    "Profile Creation": "Profile creation workflow is coming soon.",
    "Orientation Schedule":
      "Orientation scheduling tools will be available here.",
    "Start Date": "Start date coordination will be available here.",
    "Benefits Enroll":
      "Track and manage applicant benefits enrollment progress.",
  };

  // Document management state

  const [documentRequirements, setDocumentRequirements] = useState([]);

  const [documentSubmissions, setDocumentSubmissions] = useState([]);

  const [followUpRequests, setFollowUpRequests] = useState([]);

  const [loadingFollowUpRequests, setLoadingFollowUpRequests] = useState(false);

  const [followUpRequestsError, setFollowUpRequestsError] = useState("");

  const [showFollowUpModal, setShowFollowUpModal] = useState(false);

  const [selectedFollowUpRequest, setSelectedFollowUpRequest] =
    useState(null);

  const [followUpActionType, setFollowUpActionType] = useState(null);

  const [followUpActionForm, setFollowUpActionForm] = useState({
    extensionDays: 3,

    hrResponse: "",
  });

  const [followUpActionLoading, setFollowUpActionLoading] = useState(false);

  const [showDocumentModal, setShowDocumentModal] = useState(false);

  const [selectedApplicationForDocs, setSelectedApplicationForDocs] =
    useState(null);

  const [documentModalTab, setDocumentModalTab] = useState(
    "Applicant Identification"
  );

const [documentModalReadOnly, setDocumentModalReadOnly] = useState(false);

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

const GOVERNMENT_ID_FIELD_MAP = {
  sssDocument: {
    field: "sss_number",
    label: "SSS Number",
  },
  philhealthDocument: {
    field: "philhealth_number",
    label: "PhilHealth Number",
  },
  pagibigDocument: {
    field: "pagibig_number",
    label: "Pag-IBIG MID Number",
  },
  tinDocument: {
    field: "tin_number",
    label: "TIN (Tax Identification Number)",
  },
};

const GOVERNMENT_ID_TO_FORM_FIELD_MAP = {
  sssDocument: "sss",
  philhealthDocument: "philhealth",
  pagibigDocument: "pagibig",
  tinDocument: "tin",
};

const normalizeGovernmentIdValue = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
};

const extractGovernmentIdsFromOverview = (overview) => {
  const result = {
    sss: "",
    philhealth: "",
    pagibig: "",
    tin: "",
  };

  if (!overview) {
    return result;
  }

  const documents = Array.isArray(overview.documents)
    ? overview.documents
    : [];

  documents.forEach((doc) => {
    if (!doc) {
      return;
    }

    const documentKey = doc.document_key || doc.documentKey;
    if (!documentKey || !Object.prototype.hasOwnProperty.call(GOVERNMENT_ID_TO_FORM_FIELD_MAP, documentKey)) {
      return;
    }

    const formField = GOVERNMENT_ID_TO_FORM_FIELD_MAP[documentKey];
    const config = GOVERNMENT_ID_FIELD_MAP[documentKey];
    const submission = doc.submission || null;

    if (!config || !submission) {
      return;
    }

    const candidateKeys = [
      config.field,
      config.field?.toLowerCase(),
      config.field?.toUpperCase(),
      config.field?.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
    ].filter(Boolean);

    const candidateSources = [
      submission,
      submission.data,
      submission.details,
      submission.metadata,
      submission.meta,
      submission.fields,
    ].filter((source) => source && typeof source === "object");

    let resolvedValue = "";

    for (const source of candidateSources) {
      for (const key of candidateKeys) {
        if (
          Object.prototype.hasOwnProperty.call(source, key) &&
          source[key] !== undefined &&
          source[key] !== null
        ) {
          resolvedValue = source[key];
          break;
        }
      }

      if (resolvedValue) {
        break;
      }
    }

    const normalizedValue = normalizeGovernmentIdValue(resolvedValue);
    if (normalizedValue) {
      result[formField] = normalizedValue;
    }
  });

  return result;
};

const sanitizeNameForEmail = (value) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

const generateCompanyEmail = (fullName, domain = COMPANY_EMAIL_DOMAIN) => {
  if (!fullName) {
    return "";
  }

  const parts = fullName
    .split(/\s+/)
    .map((part) => sanitizeNameForEmail(part))
    .filter(Boolean);

  if (!parts.length) {
    return "";
  }

  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const localPart = last ? `${first}.${last}` : first;

  return `${localPart}@${domain}`;
};

const getApiBaseUrl = () => {
  const envBase =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    "";

  if (envBase && typeof envBase === "string") {
    return envBase.endsWith("/") ? envBase.slice(0, -1) : envBase;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, "");
    if (/:\d+$/u.test(origin)) {
      return origin;
    }
    return `${origin}:8000`;
  }

  return "http://localhost:8000";
};

const PROFILE_PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Crect fill='%23e2e8f0' width='128' height='128'/%3E%3Ccircle cx='64' cy='48' r='28' fill='%23cbd5f5'/%3E%3Cpath d='M22 118c0-24 19-44 42-44s42 20 42 44' fill='%23cbd5f5'/%3E%3C/svg%3E";

const normalizeAssetUrl = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const baseUrl = getApiBaseUrl();
  const normalizedBase = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl || "";
  const normalizedPath = trimmed.startsWith("/")
    ? trimmed
    : `/${trimmed}`;

  return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
};

const resolveSubmissionFileUrl = (submission) => {
  if (!submission || typeof submission !== "object") {
    return "";
  }

  const candidateKeys = [
    "preview_url",
    "previewUrl",
    "file_url",
    "fileUrl",
    "document_url",
    "documentUrl",
    "download_url",
    "downloadUrl",
    "public_url",
    "publicUrl",
    "url",
    "path",
    "storage_path",
    "storagePath",
    "value",
  ];

  const visited = new WeakSet();

  const resolveValue = (value) => {
    if (!value) {
      return "";
    }

    if (typeof value === "string") {
      return normalizeAssetUrl(value);
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const url = resolveValue(item);
        if (url) {
          return url;
        }
      }
      return "";
    }

    if (typeof value === "object") {
      if (visited.has(value)) {
        return "";
      }

      visited.add(value);

      for (const key of candidateKeys) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const url = resolveValue(value[key]);
          if (url) {
            return url;
          }
        }
      }

      const nestedCandidates = [
        value.file,
        value.document,
        value.attachment,
        value.source,
      ];

      for (const nested of nestedCandidates) {
        const url = resolveValue(nested);
        if (url) {
          return url;
        }
      }
    }

    return "";
  };

  return resolveValue(submission);
};

const extractProfilePhotoFromOverview = (overview) => {
  if (!overview) {
    return "";
  }

  const documents = Array.isArray(overview.documents)
    ? overview.documents
    : Array.isArray(overview)
    ? overview
    : [];

  const list = documents.length
    ? documents
    : Array.isArray(overview.documents)
    ? overview.documents
    : [];

  const matchesPhotoDoc = (doc) => {
    if (!doc) {
      return false;
    }

    const documentKey = (doc.document_key || doc.documentKey || "").toLowerCase();
    if (["photo", "idphoto", "photo2x2"].includes(documentKey)) {
      return true;
    }

    const title = (doc.title || "").toLowerCase();
    if (
      title.includes("2x2") ||
      title.includes("passport") ||
      title.includes("photo")
    ) {
      return true;
    }

    const keywords = Array.isArray(doc.keywords) ? doc.keywords : [];
    return keywords.some((keyword) => {
      const lower = (keyword || "").toLowerCase();
      return lower.includes("2x2") || lower.includes("photo");
    });
  };

  for (const doc of list) {
    if (!matchesPhotoDoc(doc)) {
      continue;
    }

    const submission = doc.submission || doc.latestSubmission || null;
    const url = resolveSubmissionFileUrl(submission);
    if (url) {
      return url;
    }
  }

  return "";
};

const PROFILE_MODAL_BODY_STYLE = {
  background:
    "linear-gradient(135deg, rgba(13,110,253,0.08), rgba(102,16,242,0.06))",
};

const PROFILE_MODAL_CONTAINER_STYLE = {
  maxWidth: "1080px",
  margin: "0 auto",
};

const PROFILE_PHOTO_BOX_STYLE = {
  width: "160px",
  height: "160px",
  borderRadius: "18px",
  border: "2px solid rgba(148, 163, 184, 0.35)",
  overflow: "hidden",
  background:
    "linear-gradient(135deg, rgba(226,232,240,0.9), rgba(203,213,225,0.9))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const PROFILE_PHOTO_IMAGE_STYLE = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const PROFILE_SECTION_CARD_STYLE = {
  border: "none",
  borderRadius: "18px",
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
};

const PROFILE_SECTION_BAR_STYLE = {
  width: "6px",
  minWidth: "6px",
  height: "56px",
  borderRadius: "999px",
  background:
    "linear-gradient(180deg, rgba(13,110,253,0.95), rgba(102,16,242,0.75))",
};

const PROFILE_SECTION_TITLE_STYLE = {
  fontSize: "1.125rem",
  fontWeight: 600,
  color: "#0f172a",
};

const PROFILE_SECTION_SUBTITLE_STYLE = {
  fontSize: "0.95rem",
  color: "#64748b",
};

const PROFILE_HEADER_BADGE_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  padding: "0.45rem 0.85rem",
  borderRadius: "999px",
  backgroundColor: "rgba(13,110,253,0.12)",
  color: "#0d6efd",
  fontSize: "0.75rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontWeight: 600,
};

const PROFILE_INPUT_STYLE = {
  backgroundColor: "#f8fafc",
  border: "1px solid rgba(148, 163, 184, 0.35)",
  borderRadius: "12px",
  padding: "0.6rem 0.75rem",
  color: "#1e293b",
  fontWeight: 500,
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};

const PROFILE_TEXTAREA_STYLE = {
  ...PROFILE_INPUT_STYLE,
  minHeight: "110px",
  resize: "vertical",
};

const PROFILE_READONLY_INPUT_STYLE = {
  ...PROFILE_INPUT_STYLE,
  backgroundColor: "#eef2ff",
  borderColor: "rgba(99, 102, 241, 0.35)",
  color: "#3730a3",
  fontWeight: 600,
};

const PROFILE_LABEL_CLASSNAME =
  "text-uppercase small fw-semibold text-secondary";

const GOVERNMENT_ID_FORM_FIELD_MAP = {
  sss_number: "sssNumber",
  philhealth_number: "philhealthNumber",
  pagibig_number: "pagibigNumber",
};

const visibleDocumentTabs = documentModalReadOnly
  ? documentModalTabs.filter((tab) => tab !== "Follow-Up Requests")
  : documentModalTabs;

useEffect(() => {
  if (documentModalReadOnly && documentModalTab === "Follow-Up Requests") {
    setDocumentModalTab("Applicant Identification");
  }
}, [documentModalReadOnly, documentModalTab]);

const closeDocumentModal = useCallback(() => {
  setShowDocumentModal(false);
  setDocumentModalReadOnly(false);
  setSelectedApplicationForDocs(null);
  setDocumentRequirements([]);
  setDocumentSubmissions([]);
  setFollowUpRequests([]);
  setFollowUpRequestsError("");
}, []);

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

        description: "Upload your Pag-IBIG Member's Data Form (MDF) or MID card showing your HDMF number.",

        keywords: ["pag-ibig", "pagibig", "hdmf"],

        documentKey: "pagibigDocument",
      },

      {
        key: "tin-document",

        title: "TIN Submission Form",

        description: "Provide your BIR Form 1902/1905 or any document showing your Tax Identification Number.",

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

  const mapGovernmentIdentifiersFromSubmissions = useCallback(
    (submissions = documentSubmissions) => {
      const identifiers = {
        sssNumber: "",
        philhealthNumber: "",
        pagibigNumber: "",
        membershipProofName: "",
      };

      if (!Array.isArray(submissions)) {
        return identifiers;
      }

      submissions.forEach((submission) => {
        if (!submission) return;

        const documentKey =
          submission.document_key || submission.documentKey || null;

        if (!documentKey) return;

        const config = GOVERNMENT_ID_FIELD_MAP[documentKey];
        if (!config) return;

        const formField = GOVERNMENT_ID_FORM_FIELD_MAP[config.field];
        if (!formField) return;

        const rawValue = submission[config.field];
        const normalized =
          typeof rawValue === "string"
            ? rawValue.trim()
            : rawValue !== null && rawValue !== undefined
            ? String(rawValue).trim()
            : "";

        if (normalized) {
          identifiers[formField] = normalized;
        }
      });

      return identifiers;
    },
    [documentSubmissions]
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

  const [newRequirement, setNewRequirement] = useState({
    document_name: "",

    description: "",

    is_required: true,

    file_format: "JPEG, JPG, PNG, PDF",

    max_file_size_mb: 5,
  });

  // Document tab filter and search state


  const [documentSearchTerm, setDocumentSearchTerm] = useState("");

  const [benefitsSearchTerm, setBenefitsSearchTerm] = useState("");
  const [benefitsStatusFilter, setBenefitsStatusFilter] = useState("All");
  const [benefitsDepartmentFilter, setBenefitsDepartmentFilter] =
    useState("All");
  const [benefitsPositionFilter, setBenefitsPositionFilter] = useState("All");
  const benefitsFilterOptions = useMemo(() => {
    const departmentSet = new Set();
    const positionSet = new Set();

    applicants.forEach((applicant) => {
      if (!applicant?.is_in_benefits_enrollment) {
        return;
      }

      const department =
        applicant.jobPosting?.department ||
        applicant.job_posting?.department ||
        "";

      if (department) {
        departmentSet.add(department);
      }

      const position =
        applicant.jobPosting?.position ||
        applicant.job_posting?.position ||
        "";

      if (position) {
        positionSet.add(position);
      }
    });

    return {
      departments: ["All", ...Array.from(departmentSet).sort()],
      positions: ["All", ...Array.from(positionSet).sort()],
    };
  }, [applicants]);
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [benefitsModalLoading, setBenefitsModalLoading] = useState(false);
  const [benefitsSaving, setBenefitsSaving] = useState(false);
  const [benefitsSubmitMode, setBenefitsSubmitMode] = useState("save");
  const [showBenefitsSubmitConfirm, setShowBenefitsSubmitConfirm] =
    useState(false);
  const [benefitsForm, setBenefitsForm] = useState(createBenefitsEnrollmentForm);
  const [benefitsApplicantInfo, setBenefitsApplicantInfo] = useState(null);
  const [benefitsEnrollmentStatus, setBenefitsEnrollmentStatus] =
    useState("pending");
  const [selectedApplicationForBenefits, setSelectedApplicationForBenefits] =
    useState(null);
  const [benefitsValidationErrors, setBenefitsValidationErrors] = useState([]);
  const [benefitsEditable, setBenefitsEditable] = useState(false);
  const [benefitsDocumentOverview, setBenefitsDocumentOverview] = useState(null);
  const [profileCreationQueue, setProfileCreationQueue] = useState(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const stored = window.localStorage.getItem(
        PROFILE_CREATION_QUEUE_STORAGE_KEY
      );

      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to parse profile creation queue:", error);
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        PROFILE_CREATION_QUEUE_STORAGE_KEY,
        JSON.stringify(profileCreationQueue)
      );
    } catch (error) {
      console.error("Failed to persist profile creation queue:", error);
    }
  }, [profileCreationQueue]);

  const [profileCreationModalVisible, setProfileCreationModalVisible] =
    useState(false);
  const [activeProfileCreationEntry, setActiveProfileCreationEntry] =
    useState(null);
  const [profileCreationForm, setProfileCreationForm] = useState(
    createEmptyProfileForm()
  );
const [profileCreationSaving, setProfileCreationSaving] = useState(false);

  useEffect(() => {
    setProfileCreationForm((prev) => {
      const computedAge = calculateAgeFromDateOfBirth(prev.dateOfBirth);
      if (computedAge === prev.age) {
        return prev;
      }

      return {
        ...prev,
        age: computedAge,
      };
    });
  }, [profileCreationForm.dateOfBirth]);

  const [applicantsDocumentStatus, setApplicantsDocumentStatus] = useState({});

  // Document review state

  const [rejectingSubmissionId, setRejectingSubmissionId] = useState(null);

  const [rejectionReason, setRejectionReason] = useState("");

  const [reviewingDocument, setReviewingDocument] = useState(false);

  const [rejectingDocumentKey, setRejectingDocumentKey] = useState(null);

  // Batch interview functionality

  const [showBatchInterviewModal, setShowBatchInterviewModal] = useState(false);

  const [showStartOnboardingModal, setShowStartOnboardingModal] =
    useState(false);

  const [selectedApplicants, setSelectedApplicants] = useState([]);

  // Determine if an offer was already sent for a given applicant (from localStorage)

  const isOfferSent = useCallback((applicationRecord) => {
    if (!applicationRecord) {
      return false;
    }

    const status = (applicationRecord.status || "").toLowerCase();

    if (["offered", "offer accepted", "hired"].includes(status)) {
      return true;
    }

    if (applicationRecord.is_offer_locked) {
      return true;
    }

    const jobOfferStatus =
      applicationRecord.offer_status ||
      applicationRecord.jobOffer?.status ||
      applicationRecord.job_offer?.status;

    if (!jobOfferStatus) {
      return false;
    }

    return jobOfferStatus !== "declined";
  }, []);

  const [batchInterviewData, setBatchInterviewData] = useState({
    interview_date: "",

    interview_time: "",

    interview_type: "On-site",

    location: "",

    interviewer: "",

    notes: "",

  stage: "general",
  });

  // Fetch applicants from JobPortal applications

  const fetchApplicants = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      console.log(
        "🔍 [Onboarding] Fetching applicants with token:",

        token ? "Present" : "Missing"
      );

      const response = await axios.get(
        "http://localhost:8000/api/applications",

        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("📊 [Onboarding] API Response:", response.data);

      console.log("📊 [Onboarding] Applications count:", response.data.length);

      // Handle both array and object responses

      const applications = Array.isArray(response.data)
        ? response.data
        : response.data.data || [];

      // Debug: Log first application structure

      if (applications.length > 0) {
        console.log(
          "🔍 [Onboarding] First application structure:",

          applications[0]
        );

        console.log(
          "🔍 [Onboarding] Applicant data:",

          applications[0].applicant
        );

        console.log(
          "🔍 [Onboarding] Job posting data:",

          applications[0].jobPosting
        );

        console.log(
          "🔍 [Onboarding] Job title:",

          applications[0].jobPosting?.title
        );

        console.log(
          "🔍 [Onboarding] Job department:",

          applications[0].jobPosting?.department
        );

        console.log(
          "🔍 [Onboarding] Job position:",

          applications[0].jobPosting?.position
        );

        // Debug offer acceptance date

        if (applications[0].status === "Offer Accepted") {
          console.log(
            "🔍 [Onboarding] Offer Accepted - offer_accepted_at:",

            applications[0].offer_accepted_at
          );
        }
      }

      setApplicants(applications);

      console.log("✅ [Onboarding] Applications loaded:", applications.length);
    } catch (error) {
      console.error("❌ [Onboarding] Error fetching applicants:", error);

      console.error("❌ [Onboarding] Error details:", error.response?.data);

      setApplicants([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter applicants based on active tab

  const getFilteredApplicants = useCallback(() => {
    if (activeTab === "Overview") {
      return applicants;
    }

    console.log("🔍 [Onboarding] Filtering applicants for tab:", activeTab);

    console.log(
      "🔍 [Onboarding] Total applicants before filtering:",

      applicants.length
    );

    const filtered = applicants.filter((applicant) => {
      const status = applicant.status;

      console.log(
        "🔍 [Onboarding] Checking applicant status:",

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
          return (
            status === "Onboarding" ||
            status === "Document Submission" ||
            status === "Orientation Schedule" ||
            status === "Starting Date" ||
            status === "Benefits Enroll" ||
            status === "Profile Creation" ||
            status === "Hired"
          );

        case "Hired":
          return status === "Hired";

        case "Rejected":
          return status === "Rejected";

        default:
          return true;
      }
    });

    console.log("🔍 [Onboarding] Filtered applicants count:", filtered.length);

    return filtered;
  }, [activeTab, applicants]);

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
    console.log("🔄 [Onboarding] Tab changed to:", activeTab);

    const filtered = getFilteredApplicants();

    console.log(
      "🔄 [Onboarding] Filtered applicants for",

      activeTab,

      ":",

      filtered.length
    );
  }, [activeTab, applicants, getFilteredApplicants]);

  // Fetch document statuses when Document Submission tab is active

  useEffect(() => {
    if (
      activeTab === "Onboarding" &&
      onboardingSubtab === "Document Submission"
    ) {
      // Small delay to ensure applicants list is refreshed first

      const timer = setTimeout(() => {
        fetchAllApplicantsDocumentStatus();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [activeTab, onboardingSubtab, applicants]);

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

    const onboardingStageStatuses = [
      "Document Submission",
      "Profile Creation",
      "Benefits Enroll",
      "Orientation Schedule",
      "Starting Date",
    ];

    const normalizedStatus = onboardingStageStatuses.includes(status)
      ? "Onboarding"
      : status;

    const config =
      statusConfig[normalizedStatus] || statusConfig["Pending"];

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
      const applicantToUpdate =
        selectedRecord || selectedRecordForStatus || selectedApplicationForDocs;

      if (!applicantToUpdate) {
        alert("No applicant selected. Please select an applicant first.");
        return;
      }

      await axios.put(
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
        action === "accept" ? Math.max(request.extensionDays || 3, 1) : 3,
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

    const message = followUpActionForm.hrResponse.trim();
    if (!message) {
      alert("Please provide a message for the applicant.");
      return;
    }

    const payload = { hr_response: message };
    let endpoint = "";

    if (followUpActionType === "accept") {
      const days = parseInt(followUpActionForm.extensionDays, 10);
      if (!Number.isInteger(days) || days <= 0) {
        alert("Please provide a valid number of days for the extension.");
        return;
      }
      payload.extension_days = days;
      endpoint = "accept";
    } else if (followUpActionType === "reject") {
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

    const filtered = getFilteredApplicants();

    const onboardingApplicants = filtered.filter(
      (applicant) =>
        applicant.status === "Onboarding" ||
        applicant.status === "Document Submission" ||
        applicant.status === "Orientation Schedule" ||
        applicant.status === "Starting Date" ||
        applicant.status === "Benefits Enroll" ||
        applicant.status === "Profile Creation"
    );

    for (const applicant of onboardingApplicants) {
      try {
        // Fetch requirements

        const reqResponse = await axios.get(
          `http://localhost:8000/api/applications/${applicant.id}/documents/requirements`,

          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        // Fetch submissions

        const subResponse = await axios.get(
          `http://localhost:8000/api/applications/${applicant.id}/documents/submissions`,

          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (reqResponse.data.success && subResponse.data.success) {
          const requirements = reqResponse.data.data || [];

          const submissions = subResponse.data.data || [];

          const requiredDocs = requirements.filter((r) => r.is_required);

          if (requiredDocs.length === 0) {
            statusMap[applicant.id] = { status: "Incomplete", date: null };
          } else {
            const requiredIds = requiredDocs.map((r) => r.id);

            const approvedSubmissions = submissions.filter(
              (s) =>
                requiredIds.includes(s.document_requirement_id) &&
                (s.status === "received" || s.status === "approved")
            );

            const pendingSubmissions = submissions.filter(
              (s) =>
                requiredIds.includes(s.document_requirement_id) &&
                (s.status === "pending" ||
                  s.status === "pending_review" ||
                  s.status === "uploaded")
            );

            const rejectedSubmissions = submissions.filter(
              (s) =>
                requiredIds.includes(s.document_requirement_id) &&
                s.status === "rejected"
            );

            // Determine overall status

            let overallStatus = "Incomplete";

            let latestDate = null;

            if (approvedSubmissions.length === requiredIds.length) {
              overallStatus = "Approved Documents"; // Changed to match the display text

              latestDate = approvedSubmissions

                .map((s) => s.reviewed_at || s.submitted_at)

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

                .map((s) => s.submitted_at)

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

          const existingEntry = statusMap[applicant.id];
          if (applicant.documents_stage_status === "completed") {
            statusMap[applicant.id] = {
              status: "Completed",
              date:
                applicant.documents_completed_at ||
                existingEntry?.date ||
                applicant.documents_approved_at ||
                null,
            };
          } else if (
            applicant.documents_stage_status === "approved" &&
            (!existingEntry ||
              existingEntry.status === "Incomplete" ||
              existingEntry.status === "Pending Review")
          ) {
            statusMap[applicant.id] = {
              status: "Approved Documents",
              date:
                applicant.documents_approved_at || existingEntry?.date || null,
            };
          }
        }
      } catch (error) {
        console.error(
          `Error fetching document status for applicant ${applicant.id}:`,
          error
        );

        statusMap[applicant.id] = { status: "Incomplete", date: null };
      }
    }

    setApplicantsDocumentStatus(statusMap);
  };

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

        // Refresh document statuses for the main table

        if (
          activeTab === "Onboarding" &&
          onboardingSubtab === "Document Submission"
        ) {
          fetchAllApplicantsDocumentStatus();
        }

        // Refresh applicants list to get updated status

        await fetchApplicants();

        setRejectingSubmissionId(null);

        setRejectingDocumentKey(null);

        setRejectionReason("");

        if (selectedApplicationForDocs) {
          setSelectedApplicationForDocs({
            ...selectedApplicationForDocs,
            status:
              response.data.application_status ||
              selectedApplicationForDocs.status,
            documents_stage_status:
              response.data.documents_stage_status ||
              selectedApplicationForDocs.documents_stage_status,
            documents_completed_at:
              response.data.documents_completed_at ||
              selectedApplicationForDocs.documents_completed_at,
            is_in_benefits_enrollment:
              response.data.is_in_benefits_enrollment ??
              selectedApplicationForDocs.is_in_benefits_enrollment,
            benefits_enrollment_status:
              response.data.benefits_enrollment_status ??
              selectedApplicationForDocs.benefits_enrollment_status,
            documents_status_label:
              response.data.documents_status_label ??
              selectedApplicationForDocs.documents_status_label,
          });
        }
      }
    } catch (error) {
      console.error("Error reviewing document:", error);
    } finally {
      setReviewingDocument(false);
    }
  };

  // Handle approve document

  const handleApproveDocument = async (submission, doc) => {
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

    const documentLabel =
      doc?.title ||
      submission.document_requirement?.document_name ||
      "this document";

    const confirmApproval = window.confirm(
      `Are you sure you want to approve ${documentLabel}?`
    );

    if (!confirmApproval) {
      return;
    }

    await reviewDocumentSubmission(
      submission.id,
      "received",
      "",
      derivedDocumentKey
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

  const renderGovernmentIdCard = (config, display) => {
    if (!config) {
      return null;
    }

    const normalized = (display || "").trim();
    const isProvided =
      normalized !== "" && normalized.toLowerCase() !== "not provided" && normalized !== "—";

    const cardStyle = {
      borderRadius: "14px",
      padding: "1rem 1.25rem",
      background: isProvided
        ? "linear-gradient(135deg, rgba(13,110,253,0.12), rgba(13,110,253,0.04))"
        : "rgba(248,249,250,1)",
      border: isProvided
        ? "1px solid rgba(13,110,253,0.2)"
        : "1px dashed rgba(108,117,125,0.6)",
      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
    };

    const iconStyle = {
      width: "42px",
      height: "42px",
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isProvided ? "rgba(13,110,253,0.15)" : "rgba(220,53,69,0.1)",
      color: isProvided ? "#0d6efd" : "#dc3545",
      flexShrink: 0,
      fontSize: "1.1rem",
    };

    return (
      <div className="mb-3" style={cardStyle}>
        <div className="d-flex align-items-start gap-3">
          <div style={iconStyle}>
            <FontAwesomeIcon icon={faIdCard} />
          </div>

          <div>
            <div className="text-uppercase small fw-semibold text-muted mb-1">
              {config.label}
            </div>
            <div
              className={`fw-bold ${isProvided ? "text-dark" : "text-danger"}`}
              style={{ fontSize: "1.05rem", letterSpacing: "0.02em" }}
            >
              {isProvided ? normalized : "Not provided"}
            </div>
            {!isProvided && (
              <div className="small text-muted mt-1">
                Applicant hasn't supplied this identifier yet.
              </div>
            )}
          </div>
        </div>
      </div>
    );
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

          const governmentIdConfig =
            GOVERNMENT_ID_FIELD_MAP[doc.documentKey] || null;
          const governmentIdRawValue =
            governmentIdConfig && submission
              ? submission[governmentIdConfig.field] ?? null
              : null;
          const governmentIdValue =
            typeof governmentIdRawValue === "string"
              ? governmentIdRawValue.trim()
              : governmentIdRawValue !== null && governmentIdRawValue !== undefined
              ? String(governmentIdRawValue).trim()
              : "";
          const governmentIdDisplay =
            governmentIdValue !== ""
              ? governmentIdValue
              : submission
              ? "Not provided"
              : "—";

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

                      {renderGovernmentIdCard(
                        governmentIdConfig,
                        governmentIdDisplay
                      )}

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

                    {!documentModalReadOnly && (
                    <div className="ms-lg-auto d-flex gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        disabled={
                          !submission || isApproved || reviewingDocument
                        }
                        onClick={() => handleApproveDocument(submission, doc)}
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
                            <FontAwesomeIcon
                              icon={faTrash}
                              className="me-2"
                            />
                          Remove Request
                        </Button>
                      )}
                    </div>
                    )}
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
      handleApproveDocument,
      openSubmissionFile,
      reviewingDocument,
      statusBadgeStyles,
      documentModalReadOnly,
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
        (submission.status === "approved" || submission.status === "received")
      );
    });
  };

  const isDocumentSubmissionCompleted = () => {
    if (!selectedApplicationForDocs) {
      return false;
    }

    return (
      selectedApplicationForDocs.documents_stage_status === "completed" ||
      !!selectedApplicationForDocs.documents_completed_at ||
      selectedApplicationForDocs.documents_status_label === "Completed"
    );
  };

  // Mark document submission as done and move to next tab

  const markDocumentSubmissionAsDone = async () => {
    if (!allDocumentsApproved()) {
      alert("Please approve all required documents before marking as done.");

      return;
    }

    try {
      if (!selectedApplicationForDocs?.id) {
        alert(
          "Unable to determine the selected applicant. Please reopen the document viewer and try again."
        );
        return;
      }

      const response = await axios.post(
        `http://localhost:8000/api/applications/${selectedApplicationForDocs.id}/documents/complete`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      await fetchAllApplicantsDocumentStatus();

      closeDocumentModal();

      await fetchApplicants();

      if (selectedApplicationForDocs) {
        setSelectedApplicationForDocs({
          ...selectedApplicationForDocs,
          status: response.data.application_status || "Benefits Enroll",
          documents_stage_status:
            response.data.documents_stage_status || "completed",
          documents_completed_at: response.data.documents_completed_at,
          is_in_benefits_enrollment:
            response.data.is_in_benefits_enrollment ?? true,
          benefits_enrollment_status:
            response.data.benefits_enrollment_status || "pending",
          documents_status_label:
            response.data.documents_status_label || "Completed",
        });
      }

      alert(
        response.data?.message ||
          "Document submission marked as completed! The applicant has been moved to Benefits Enroll, and their document records remain available for review."
      );
      setOnboardingSubtab("Benefits Enroll");
    } catch (error) {
      console.error("Error updating status:", error);

      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to update status. Please try again.";

      if (
        message &&
        message.trim() !==
          "Unable to finalize the document submission. Please try again or contact support."
      ) {
        alert(message);
      }
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

  const formatDisplayTime = (timeString) => {
    if (!timeString) return "";

    const [hourStr, minuteStr] = timeString.split(":");
    let hour = parseInt(hourStr, 10);
    const minute = minuteStr || "00";
    const suffix = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute.padStart(2, "0")} ${suffix}`;
  };

  const defaultInterviewInstructions = useMemo(
    () => [
      "Please wear business or smart casual attire.",
      "Arrive 10 minutes before your scheduled time.",
      "Bring one valid government-issued ID.",
      "Prepare printed copies of your resume and supporting documents.",
      "If virtual, ensure a stable internet connection and a quiet environment.",
    ],
    []
  );

  const interviewSchedulePreview = useMemo(() => {
    const { interview_date, interview_time, end_time, interviewer } =
      interviewData;

    if (
      !interview_date ||
      !interview_time ||
      !end_time ||
      !interviewer?.trim()
    ) {
      return {
        isScheduled: false,
        message: "Your interview schedule will be posted soon.",
      };
    }

    const startDate = new Date(`${interview_date}T${interview_time}`);
    const endDate = new Date(`${interview_date}T${end_time}`);

    const dateLabel = startDate.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const startTimeLabel = formatDisplayTime(interview_time);
    const endTimeLabel = formatDisplayTime(end_time);

    return {
      isScheduled: true,
      dateLabel,
      timeLabel:
        startTimeLabel && endTimeLabel
          ? `${startTimeLabel} - ${endTimeLabel}`
          : startTimeLabel || "",
      interviewerName: interviewer,
    };
  }, [interviewData]);

  const interviewInstructionItems = useMemo(() => {
    if (interviewData.notes && interviewData.notes.trim().length > 0) {
      return interviewData.notes
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return defaultInterviewInstructions;
  }, [defaultInterviewInstructions, interviewData.notes]);

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

      stage: "general",
    });

    setShowInterviewModal(true);
  };

  // Handle view interview details

  const handleViewInterviewDetails = async (applicant) => {
    try {
      console.log(
        "🔍 [Onboarding] Looking for interview details for applicant:",

        applicant
      );

      console.log("🔍 [Onboarding] Applicant email options:", {
        "applicant.email": applicant.applicant?.email,

        employee_email: applicant.employee_email,

        "applicant.employee_email": applicant.applicant?.employee_email,
      });

      // Try to get interview details from localStorage first

      const storedInterviews = JSON.parse(
        localStorage.getItem("scheduledInterviews") || "[]"
      );

      console.log(
        "📅 [Onboarding] Stored interviews count:",

        storedInterviews.length
      );

      console.log("📅 [Onboarding] Stored interviews:", storedInterviews);

      // Look for interview details by multiple email variations

      const interviewDetails = storedInterviews.find((interview) => {
        const applicantEmail =
          interview.applicantEmail || interview.applicant_email;

        const targetEmails = [
          applicant.applicant?.email,

          applicant.employee_email,

          applicant.applicant?.employee_email,
        ].filter(Boolean);

        console.log("🔍 [Onboarding] Comparing emails:", {
          stored: applicantEmail,

          target: targetEmails,

          match: targetEmails.includes(applicantEmail),
        });

        return targetEmails.includes(applicantEmail);
      });

      if (interviewDetails) {
        console.log(
          "✅ [Onboarding] Found interview details:",

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
          "📅 [Onboarding] Stored notifications count:",

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
            "✅ [Onboarding] Found interview details in notifications:",

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
              "✅ [Onboarding] Found interview details by name match:",

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
            console.log("❌ [Onboarding] No interview details found");

            console.log(
              "❌ [Onboarding] Available stored interviews:",

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

  const handleSendInterviewInvite = async ({ mode = "submit" } = {}) => {
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

      if (
        mode === "reschedule" &&
        !window.confirm(
          "Are you sure you want to reschedule this interview for the applicant?"
        )
      ) {
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

          stage: interviewData.stage || "general",
        },

        {
          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Show appropriate message based on whether it was created or updated

      const wasUpdated = response.data?.updated || mode === "reschedule";
      const successMessage = wasUpdated
        ? "Interview invite updated successfully! The applicant will receive the revised schedule."
        : "Interview invitation sent successfully!";

      alert(successMessage);

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

        stage: interviewData.stage || batchInterviewData.stage || "general",

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
        "✅ [Onboarding] Interview details saved to localStorage:",

        interviewDetails
      );
    } catch (error) {
      console.error(
        "❌ [Onboarding] Error saving interview to localStorage:",

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

    setBatchInterviewData((prev) => ({
      ...prev,
      stage: "general",
    }));

    setShowBatchInterviewModal(true);
  };

  // Handle send batch interview invites

  const handleSendBatchInterviewInvites = async () => {
    const scheduledApplicants = [...selectedApplicants];

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

      const applicationIds = scheduledApplicants.map(
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

          stage: batchInterviewData.stage || "general",
        },

        {
          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { successful_count, failed_count, failed_interviews } =
        response.data;

      let message = `Batch interview scheduling completed!\n\n`;

      message += `✅ Successful: ${successful_count} interviews scheduled\n`;

      if (failed_count > 0) {
        message += `❌ Failed: ${failed_count} interviews\n\n`;

        message += `Failed applicants:\n`;

        failed_interviews.forEach((failed) => {
          const applicant = scheduledApplicants.find(
            (app) => app.id === failed.application_id
          );

          message += `• ${
            applicant
              ? applicant.first_name + " " + applicant.last_name
              : "Unknown"
          }: ${failed.error}\n`;
        });
      }

      alert(message);

      // Save interview details to localStorage for successful interviews

      scheduledApplicants.forEach((applicant) => {
        saveInterviewToLocalStorage(applicant, batchInterviewData);
      });

      setShowBatchInterviewModal(false);

      setSelectedApplicants([]);

      setBatchInterviewData((prev) => ({
        ...prev,
        stage: "general",
      }));

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

  const applyBenefitsPayload = (payload, options = {}) => {
    const metadata = payload?.metadata || {};
    const fields = metadata.fields || {};
    const fallbackIdentifiers = mapGovernmentIdentifiersFromSubmissions(
      options.documentSubmissions
    );

    const normalizeIdentifier = (value, key) => {
      const normalized =
        typeof value === "string"
          ? value.trim()
          : value !== null && value !== undefined
          ? String(value).trim()
          : "";

      if (normalized) {
        return normalized;
      }

      return fallbackIdentifiers[key] || "";
    };

    setBenefitsForm({
      sssNumber: normalizeIdentifier(fields.sss_number, "sssNumber"),
      philhealthNumber: normalizeIdentifier(
        fields.philhealth_number,
        "philhealthNumber"
      ),
      pagibigNumber: normalizeIdentifier(fields.pagibig_number, "pagibigNumber"),
      tinNumber: normalizeIdentifier(fields.tin_number, "tinNumber"),
      enrollmentDate: fields.enrollment_date || "",
      membershipProof: null,
      membershipProofName:
        metadata.membership_proof_name ||
        fallbackIdentifiers.membershipProofName ||
        "",
    });
    setBenefitsEnrollmentStatus(payload.enrollment_status || "pending");
    if (payload.personal_info) {
      setBenefitsApplicantInfo(payload.personal_info);
    }
  };

  const handleCloseBenefitsModal = () => {
    setShowBenefitsModal(false);
    setBenefitsModalLoading(false);
    setBenefitsSaving(false);
    setBenefitsSubmitMode("save");
    setShowBenefitsSubmitConfirm(false);
    setSelectedApplicationForBenefits(null);
    setBenefitsApplicantInfo(null);
    setBenefitsForm(createBenefitsEnrollmentForm());
    setBenefitsEnrollmentStatus("pending");
    setBenefitsValidationErrors([]);
    setBenefitsEditable(false);
    setBenefitsDocumentOverview(null);
  };

  const handleBenefitFieldChange = (field, value) => {
    setBenefitsForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEnrollBenefits = async (applicant) => {
    if (!applicant) {
      return;
    }

    setBenefitsForm(createBenefitsEnrollmentForm());
    setBenefitsApplicantInfo(null);
    setBenefitsEnrollmentStatus("pending");
    setBenefitsValidationErrors([]);
    setBenefitsSubmitMode("save");
    setShowBenefitsSubmitConfirm(false);
    setBenefitsEditable(false);
    setBenefitsDocumentOverview(null);

    setSelectedApplicationForBenefits(applicant);
    setShowBenefitsModal(true);
    setBenefitsModalLoading(true);

    let documentOverview = null;

    try {
      documentOverview = await fetchDocumentRequirements(applicant.id);
      setBenefitsDocumentOverview(documentOverview);
    } catch (docError) {
      console.error(
        "Error preloading document overview for benefits enrollment:",
        docError
      );
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:8000/api/applications/${applicant.id}/benefits-enrollment`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.success) {
        applyBenefitsPayload(response.data, {
          documentSubmissions: documentOverview?.submissions,
        });
      }
    } catch (error) {
      console.error("Error loading benefits enrollment:", error);
      alert("Failed to load benefits enrollment details. Please try again.");
      handleCloseBenefitsModal();
    } finally {
      setBenefitsModalLoading(false);
    }
  };

  const handleQueueForProfileCreation = () => {
    if (!selectedApplicationForBenefits) {
      alert("Select an applicant before marking benefits as complete.");
      return;
    }

    const applicantRecord = selectedApplicationForBenefits;
    const applicantId = applicantRecord.id;

    if (profileCreationQueue.some((entry) => entry.id === applicantId)) {
      alert("This applicant is already listed in the Profile Creation tab.");
      handleCloseBenefitsModal();
      setActiveTab("Onboarding");
      setOnboardingSubtab("Profile Creation");
      return;
    }

    const applicantCore = applicantRecord.applicant || {};

    const resolvedName =
      benefitsApplicantInfo?.name ||
      (applicantCore.first_name || applicantCore.last_name
        ? `${applicantCore.first_name || ""} ${
            applicantCore.last_name || ""
          }`.trim()
        : applicantRecord.employee_name || "N/A");

    const resolvedEmail =
      benefitsApplicantInfo?.email ||
      applicantCore.email ||
      applicantRecord.employee_email ||
      "";

    const resolvePhoneNumber = () => {
      const candidates = [
        benefitsApplicantInfo?.contact_number,
        benefitsApplicantInfo?.phone_number,
        applicantCore.contact_number,
        applicantCore.phone_number,
        applicantRecord.contact_number,
        applicantRecord.phone_number,
      ];

      return candidates.find((value) =>
        typeof value === "string" && value.trim().length > 0
      )?.trim();
    };

    const resolvedDepartment =
      benefitsApplicantInfo?.department ||
      applicantRecord.jobPosting?.department ||
      applicantRecord.job_posting?.department ||
      "";

    const resolvedPosition =
      benefitsApplicantInfo?.position ||
      applicantRecord.jobPosting?.position ||
      applicantRecord.job_posting?.position ||
      "";

    const resolvedEmploymentStatus =
      benefitsApplicantInfo?.employment_status ||
      applicantRecord.employment_status ||
      applicantCore.employment_status ||
      "";

    const resolvedDateStarted =
      benefitsApplicantInfo?.date_started ||
      applicantRecord.date_started ||
      applicantCore.date_started ||
      "";

    const resolvedSalary =
      benefitsApplicantInfo?.salary ||
      applicantRecord.salary ||
      (applicantRecord.jobPosting?.salary_min &&
      applicantRecord.jobPosting?.salary_max
        ? `${applicantRecord.jobPosting.salary_min} - ${applicantRecord.jobPosting.salary_max}`
        : applicantRecord.job_posting?.salary_min &&
          applicantRecord.job_posting?.salary_max
        ? `${applicantRecord.job_posting.salary_min} - ${applicantRecord.job_posting.salary_max}`
        : "");

    const resolvedAddress = benefitsApplicantInfo?.address || {};

    const calculateAge = (birthDateValue) => {
      if (!birthDateValue) {
        return "";
      }

      const birthDate = new Date(birthDateValue);
      if (Number.isNaN(birthDate.getTime())) {
        return "";
      }

      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const hasHadBirthdayThisYear =
        today.getMonth() > birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() &&
          today.getDate() >= birthDate.getDate());

      if (!hasHadBirthdayThisYear) {
        age -= 1;
      }

      return age >= 0 ? String(age) : "";
    };

    const resolvedDateOfBirth =
      benefitsApplicantInfo?.date_of_birth ||
      applicantCore.date_of_birth ||
      "";

    const fallbackPhotoCandidates = [
      benefitsApplicantInfo?.profile_photo_url,
      benefitsApplicantInfo?.photo_url,
      benefitsApplicantInfo?.profilePhotoUrl,
      applicantCore.profile_photo_url,
      applicantCore.photo_url,
      applicantRecord.profile_photo_url,
      applicantRecord.photo_url,
    ];

    const fallbackProfilePhotoUrl =
      fallbackPhotoCandidates
        .map((candidate) => normalizeAssetUrl(candidate))
        .find((candidate) => candidate && candidate.length > 0) || "";

    const resolvedProfilePhotoUrl =
      extractProfilePhotoFromOverview(benefitsDocumentOverview) ||
      fallbackProfilePhotoUrl;

    const resolvedProfileData = {
      fullName: resolvedName,
      nickname: benefitsApplicantInfo?.nickname || applicantCore.nickname || "",
      civilStatus:
        benefitsApplicantInfo?.civil_status ||
        applicantCore.civil_status ||
        "",
      gender: benefitsApplicantInfo?.gender || applicantCore.gender || "",
      dateOfBirth: resolvedDateOfBirth,
      age:
        benefitsApplicantInfo?.age ||
        applicantCore.age ||
        calculateAge(resolvedDateOfBirth),
      phoneNumber: resolvePhoneNumber() || "",
      companyEmail: generateCompanyEmail(resolvedName),
      emergencyContactName:
        benefitsApplicantInfo?.emergency_contact_name ||
        applicantCore.emergency_contact_name ||
        "",
      emergencyContactPhone:
        benefitsApplicantInfo?.emergency_contact_phone ||
        applicantCore.emergency_contact_phone ||
        "",
      province:
        resolvedAddress.province ||
        applicantCore.province ||
        applicantRecord.province ||
        "",
      barangay:
        resolvedAddress.barangay ||
        applicantCore.barangay ||
        applicantRecord.barangay ||
        "",
      city:
        resolvedAddress.city ||
        resolvedAddress.city_municipality ||
        applicantCore.city ||
        applicantRecord.city ||
        "",
      postalCode:
        resolvedAddress.postal_code ||
        applicantCore.postal_code ||
        applicantRecord.postal_code ||
        "",
      presentAddress:
        resolvedAddress.present_address ||
        resolvedAddress.full ||
        applicantCore.present_address ||
        "",
      position: resolvedPosition,
      department: resolvedDepartment,
      employmentStatus: resolvedEmploymentStatus,
      dateStarted: resolvedDateStarted,
      salary: resolvedSalary,
      tenure: benefitsApplicantInfo?.tenure || "",
      sss: benefitsForm.sssNumber || "",
      philhealth: benefitsForm.philhealthNumber || "",
      pagibig: benefitsForm.pagibigNumber || "",
      tin: benefitsForm.tinNumber || "",
      profilePhotoUrl: resolvedProfilePhotoUrl,
    };

    const queueEntry = {
      id: applicantId,
      name: resolvedName,
      email: resolvedEmail,
      department: resolvedDepartment,
      position: resolvedPosition,
      enrollmentStatus: benefitsEnrollmentStatus,
      addedAt: new Date().toISOString(),
      profileData: resolvedProfileData,
      profileDataUpdatedAt: null,
    };

    setProfileCreationQueue((prev) => [...prev, queueEntry]);
    alert("Applicant added to the Profile Creation tab.");
    handleCloseBenefitsModal();
    setActiveTab("Onboarding");
    setOnboardingSubtab("Profile Creation");
  };

  const resetProfileCreationForm = useCallback(() => {
    setProfileCreationForm(createEmptyProfileForm());
  }, []);

  const handleOpenProfileCreationModal = useCallback(
    (entry) => {
      if (!entry) {
        return;
      }

      setActiveProfileCreationEntry(entry);
      const defaults = createEmptyProfileForm();
      const existing = entry.profileData || {};
      const resolvedFullName = resolveProfileFullName(entry, existing);
      const generatedCompanyEmail = generateCompanyEmail(resolvedFullName);
      const initialCompanyEmail =
        existing.companyEmail ||
        generatedCompanyEmail ||
        existing.email ||
        entry.email ||
        "";
      const initialProfilePhotoUrl =
        normalizeAssetUrl(
          existing.profilePhotoUrl ||
            existing.profile_photo_url ||
            entry.profilePhotoUrl ||
            entry.profile_photo_url
        ) || "";
      setProfileCreationForm({
        ...defaults,
        ...existing,
        fullName: resolvedFullName,
        companyEmail: initialCompanyEmail,
        profilePhotoUrl: initialProfilePhotoUrl,
        position: existing.position || entry.position || "",
        department: existing.department || entry.department || "",
        sss: existing.sss || "",
        philhealth: existing.philhealth || "",
        pagibig: existing.pagibig || "",
        tin: existing.tin || "",
      });
      setProfileCreationModalVisible(true);

      const entryId = entry.id;
      if (!entryId) {
        return;
      }

      const loadGovernmentIds = async () => {
        try {
          const overviewResult = await fetchDocumentRequirements(entryId);
          const overviewData =
            overviewResult?.overview || overviewResult?.overviewData || overviewResult;

          if (!overviewData) {
            return;
          }

          const governmentIds = extractGovernmentIdsFromOverview(overviewData);
          const profilePhotoUrl = normalizeAssetUrl(
            extractProfilePhotoFromOverview(overviewData)
          );
          setProfileCreationForm((prev) => ({
            ...prev,
            sss: governmentIds.sss || prev.sss,
            philhealth: governmentIds.philhealth || prev.philhealth,
            pagibig: governmentIds.pagibig || prev.pagibig,
            tin: governmentIds.tin || prev.tin,
            profilePhotoUrl: profilePhotoUrl || prev.profilePhotoUrl,
          }));
        } catch (error) {
          console.error(
            `Failed to fetch government IDs for application ${entryId}:`,
            error
          );
        }
      };

      loadGovernmentIds();
    },
    [fetchDocumentRequirements, setProfileCreationModalVisible]
  );

  const handleCloseProfileCreationModal = useCallback(() => {
    setProfileCreationModalVisible(false);
    setActiveProfileCreationEntry(null);
    resetProfileCreationForm();
  }, [resetProfileCreationForm]);

  const handleProfileCreationInputChange = (field, value) => {
    setProfileCreationForm((prev) => {
      const next = {
        ...prev,
        [field]: value,
      };

      if (field === "dateOfBirth") {
        next.age = calculateAgeFromBirthdate(value);
      }

      if (field === "fullName") {
        next.companyEmail = generateCompanyEmail(value) || "";
      }

      return next;
    });
  };

  const renderProfileSection = (title, subtitle, content) => (
    <Card
      key={title}
      className="border-0 shadow-sm rounded-4 mb-4"
      style={PROFILE_SECTION_CARD_STYLE}
    >
      <Card.Body className="p-4 p-lg-5">
        <div className="d-flex align-items-start gap-3 mb-4">
          <div style={PROFILE_SECTION_BAR_STYLE} />
          <div>
            <h5 className="mb-1" style={PROFILE_SECTION_TITLE_STYLE}>
              {title}
            </h5>
            {subtitle ? (
              <p className="mb-0" style={PROFILE_SECTION_SUBTITLE_STYLE}>
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {content}
      </Card.Body>
    </Card>
  );

  const displayedProfilePhotoUrl = useMemo(
    () =>
      profileCreationForm.profilePhotoUrl &&
      profileCreationForm.profilePhotoUrl.length > 0
        ? profileCreationForm.profilePhotoUrl
        : PROFILE_PLACEHOLDER_IMAGE,
    [profileCreationForm.profilePhotoUrl]
  );

  const handleProfilePhotoError = useCallback(
    (event) => {
      if (!event || !event.target) {
        return;
      }

      event.target.onerror = null;
      event.target.src = PROFILE_PLACEHOLDER_IMAGE;
    },
    []
  );

  const handleSaveProfileCreationForm = async () => {
    if (!activeProfileCreationEntry || profileCreationSaving) {
      return;
    }

    const requiredFields = [
      "nickname",
      "civilStatus",
      "gender",
      "dateOfBirth",
      "age",
      "phoneNumber",
      "emergencyContactName",
      "emergencyContactPhone",
      "province",
      "barangay",
      "city",
      "postalCode",
      "presentAddress",
      "position",
      "department",
      "employmentStatus",
      "dateStarted",
      "salary",
      "tenure",
    ];

    const hasMissingRequiredFields = requiredFields.some((fieldKey) => {
      const value = profileCreationForm[fieldKey];
      if (value === null || value === undefined) {
        return true;
      }
      if (typeof value === "string") {
        return value.trim() === "";
      }
      return false;
    });

    if (hasMissingRequiredFields) {
      alert("Please fill out all required fields before saving.");
      return;
    }

    const applicationId = activeProfileCreationEntry.id;
    const numericAge = Number.parseInt(profileCreationForm.age, 10);
    const payload = {
      full_name: profileCreationForm.fullName || activeProfileCreationEntry.name,
      nickname: profileCreationForm.nickname,
      civil_status: profileCreationForm.civilStatus,
      gender: profileCreationForm.gender,
      birth_date: profileCreationForm.dateOfBirth,
      age: Number.isNaN(numericAge) ? 0 : numericAge,
      company_email: profileCreationForm.companyEmail,
      contact_number: profileCreationForm.phoneNumber,
      emergency_contact_name: profileCreationForm.emergencyContactName,
      emergency_contact_phone: profileCreationForm.emergencyContactPhone,
      province: profileCreationForm.province,
      barangay: profileCreationForm.barangay,
      city: profileCreationForm.city,
      postal_code: profileCreationForm.postalCode,
      present_address: profileCreationForm.presentAddress,
      position: profileCreationForm.position,
      department: profileCreationForm.department,
      employment_status: profileCreationForm.employmentStatus,
      hire_date: profileCreationForm.dateStarted,
      salary:
        typeof profileCreationForm.salary === "string"
          ? profileCreationForm.salary.replace(/,/g, "")
          : profileCreationForm.salary,
      tenurity: profileCreationForm.tenure,
      sss: profileCreationForm.sss || null,
      philhealth: profileCreationForm.philhealth || null,
      pagibig: profileCreationForm.pagibig || null,
      tin_no: profileCreationForm.tin || null,
      metadata: {
        profile_photo_url: profileCreationForm.profilePhotoUrl || null,
      },
    };

    try {
      setProfileCreationSaving(true);

      const token = localStorage.getItem("token");
      const response = await axios.post(
        `http://localhost:8000/api/applications/${applicationId}/profile-creation`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.success) {
        const createdEmployeeProfile = response.data?.employee_profile;

        if (createdEmployeeProfile) {
          window.dispatchEvent(
            new CustomEvent("employee-records:new-entry", {
              detail: createdEmployeeProfile,
            })
          );
        }

        // Keep applicant records visible in all tabs (Document Submission, Benefits Enrollment, Profile Creation)
        // Do not remove from queues or applicant lists
        
        await fetchApplicants();

        alert("Personal information saved and linked to employee records.");
        handleCloseProfileCreationModal();
      }
    } catch (error) {
      console.error("Error saving personal information:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.company_email?.[0] ||
        error.response?.data?.errors?.full_name?.[0] ||
        "Failed to save personal information. Please try again.";
      alert(errorMessage);
    } finally {
      setProfileCreationSaving(false);
    }
  };

  const handleBenefitsSubmit = async (targetStatus = null) => {
    if (!selectedApplicationForBenefits) {
      return;
    }

    const validationErrors = validateBenefitsForm();
    if (validationErrors.length > 0) {
      setBenefitsValidationErrors(validationErrors);
      return;
    }

    const submitMode = targetStatus === "completed" ? "submit" : "save";
    setBenefitsSubmitMode(submitMode);

    try {
      setBenefitsSaving(true);

      const token = localStorage.getItem("token");

      const nextStatus =
        targetStatus ||
        (benefitsEnrollmentStatus === "completed" ? "completed" : "in_progress");

      const formData = new FormData();
      formData.append("enrollment_status", nextStatus);
      formData.append("sss_number", benefitsForm.sssNumber || "");
      formData.append("philhealth_number", benefitsForm.philhealthNumber || "");
      formData.append("pagibig_number", benefitsForm.pagibigNumber || "");
      formData.append("tin_number", benefitsForm.tinNumber || "");
      formData.append("enrollment_date", benefitsForm.enrollmentDate || "");

      if (benefitsForm.membershipProof instanceof File) {
        formData.append("membership_proof", benefitsForm.membershipProof);
      } else if (!benefitsForm.membershipProof) {
        formData.append("membership_proof", "");
      }

      const response = await axios.post(
        `http://localhost:8000/api/applications/${selectedApplicationForBenefits.id}/benefits-enrollment`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data?.success) {
        applyBenefitsPayload(response.data);
        setBenefitsEnrollmentStatus(response.data.enrollment_status || nextStatus);
        setApplicants((prev) =>
          prev.map((applicationRecord) =>
            applicationRecord.id === selectedApplicationForBenefits.id
              ? {
                  ...applicationRecord,
                  benefits_enrollment_status: response.data.enrollment_status,
                }
              : applicationRecord
          )
        );

        setSelectedApplicationForBenefits((prev) =>
          prev
            ? {
                ...prev,
                benefits_enrollment_status: response.data.enrollment_status,
              }
            : prev
        );

        await fetchApplicants();

        alert("Benefit enrolled successfully.");
        setBenefitsValidationErrors([]);
      }
    } catch (error) {
      console.error("Error saving benefits enrollment:", error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Please complete required fields or correct errors.";
      const errors =
        error.response?.data?.errors && typeof error.response.data.errors === "object"
          ? Object.values(error.response.data.errors)
              .flat()
              .map((err) => String(err))
          : [message];
      setBenefitsValidationErrors(errors);
    } finally {
      setBenefitsSaving(false);
      setBenefitsSubmitMode("save");
    }
  };

  const handleConfirmBenefitsSubmit = async () => {
    setShowBenefitsSubmitConfirm(false);
    await handleBenefitsSubmit("completed");
  };

  const validateBenefitsForm = () => {
    const errors = [];

    if (benefitsSubmitMode === "submit") {
      if (!benefitsForm.enrollmentDate) {
        errors.push("Enrollment date is required when submitting.");
      }
    }

    return errors;
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
  const isApplicantInProfileQueue = selectedApplicationForBenefits
    ? profileCreationQueue.some(
        (entry) => entry.id === selectedApplicationForBenefits.id
      )
    : false;

  // Debug logging

  console.log("🔍 [Onboarding] Current state:");

  console.log("- Total applicants:", applicants.length);

  console.log("- Active tab:", activeTab);

  console.log("- Filtered applicants:", filteredApplicants.length);

  console.log("- Loading:", loading);

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

          {activeTab === "Shortlisted" && selectedApplicants.length > 0 && (
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
                      <span>{tab}</span>
                      {tab === "Profile Creation" &&
                        profileCreationQueue.length > 0 && (
                          <Badge
                            bg={onboardingSubtab === tab ? "light" : "secondary"}
                            text={onboardingSubtab === tab ? "dark" : undefined}
                            className="ms-2"
                          >
                            {profileCreationQueue.length}
                          </Badge>
                        )}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}

                {onboardingSubtab === "Document Submission" && (
                  <div>
                    {/* Filter Bar and Search */}

                    <div className="card border-0 shadow-sm mb-3">
                      <div className="card-body p-3">
                        <div className="d-flex flex-wrap align-items-center gap-3">
                          {/* Search Bar */}

                          <div className="d-flex flex-wrap align-items-center gap-3 w-100">
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
                                  placeholder="Search by employee name..."
                                  value={documentSearchTerm}
                                  onChange={(e) =>
                                    setDocumentSearchTerm(e.target.value)
                                  }
                                  style={{ borderLeft: "none" }}
                                />
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>

                    {/* Documents Table */}

                    {(() => {
                      // Filter applicants based on search and document filter

                      const allFiltered = getFilteredApplicants();

                      const documentApplicants = allFiltered.filter(
                        (applicant) =>
                          applicant.status === "Document Submission" ||
                          applicant.status === "Onboarding" ||
                          applicant.status === "Hired" ||
                          applicant.documents_stage_status === "completed" ||
                          applicant.documents_completed_at ||
                          applicant.is_in_benefits_enrollment
                      );

                      const filtered = documentApplicants.filter((applicant) => {
                        // Search filter

                        const name = applicant.applicant
                          ? `${applicant.applicant.first_name || ""} ${
                              applicant.applicant.last_name || ""
                            }`
                              .trim()
                              .toLowerCase()
                          : "";

                        const matchesSearch =
                          !documentSearchTerm ||
                          name.includes(documentSearchTerm.toLowerCase());

                        return matchesSearch;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="card border-0 shadow-sm">
                            <div className="card-body text-center py-5">
                              <h5 className="text-muted mb-2">
                                No Applicants Found
                              </h5>

                              <p className="text-muted mb-0">
                                {documentSearchTerm
                                  ? "No applicants match your search criteria."
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
                                    const baseDocStatus =
                                      applicantsDocumentStatus[applicant.id]
                                        ?.status || "Incomplete";

                                    const isCompletedStage =
                                      applicant.documents_stage_status ===
                                        "completed" ||
                                      !!applicant.documents_completed_at;

                                    const docStatus = isCompletedStage
                                      ? "Completed"
                                      : baseDocStatus;

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
                                    } else if (docStatus === "Completed") {
                                      statusVariant = "primary";

                                      statusLabel = "Completed";
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
                                            {applicant.applicant
                                              ? `${
                                                  applicant.applicant
                                                    .first_name || ""
                                                } ${
                                                  applicant.applicant
                                                    .last_name || ""
                                                }`.trim()
                                              : "N/A"}
                                          </div>

                                          <div className="small text-muted">
                                            {applicant.applicant?.email ||
                                              "N/A"}
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
                                              <div className="text-muted small">
                                                {`Submitted ${formattedDate}`}
                                              </div>
                                            )}

                                            <div className="d-flex flex-wrap gap-2">
                                              <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  setSelectedApplicationForDocs(
                                                    applicant
                                                  );
                                                  setDocumentModalReadOnly(true);
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

                {/* Benefits enrollment tab */}

                {onboardingSubtab === "Benefits Enroll" && (
                  <>
                    <div className="card border-0 shadow-sm mb-3">
                      <div className="card-body p-3">
                        <div className="d-flex flex-wrap align-items-center gap-3">
                          <div className="flex-grow-1" style={{ minWidth: "240px" }}>
                            <div className="input-group">
                              <span className="input-group-text bg-white">
                                <FontAwesomeIcon icon={faSearch} className="text-muted" />
                              </span>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Search by employee name or email..."
                                value={benefitsSearchTerm}
                                onChange={(e) => setBenefitsSearchTerm(e.target.value)}
                                style={{ borderLeft: "none" }}
                              />
                            </div>
                          </div>
                          <div style={{ minWidth: "170px" }}>
                            <Form.Select
                              value={benefitsStatusFilter}
                              onChange={(e) => setBenefitsStatusFilter(e.target.value)}
                            >
                              <option value="All">All Status</option>
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </Form.Select>
                          </div>
                          <div style={{ minWidth: "170px" }}>
                            <Form.Select
                              value={benefitsDepartmentFilter}
                              onChange={(e) =>
                                setBenefitsDepartmentFilter(e.target.value)
                              }
                            >
                              {benefitsFilterOptions.departments.map((option) => (
                                <option key={`dept-${option}`} value={option}>
                                  {option === "All" ? "All Departments" : option}
                                </option>
                              ))}
                            </Form.Select>
                          </div>
                          <div style={{ minWidth: "170px" }}>
                            <Form.Select
                              value={benefitsPositionFilter}
                              onChange={(e) =>
                                setBenefitsPositionFilter(e.target.value)
                              }
                            >
                              {benefitsFilterOptions.positions.map((option) => (
                                <option key={`pos-${option}`} value={option}>
                                  {option === "All" ? "All Positions" : option}
                                </option>
                              ))}
                            </Form.Select>
                          </div>
                        </div>
                        <div className="text-muted small mt-3">
                          Quickly search and filter by status, department, or position to
                          find applicants ready for benefits enrollment.
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const allFiltered = getFilteredApplicants();
                      const benefitsApplicants = allFiltered.filter(
                        (applicant) => applicant.is_in_benefits_enrollment
                      );

                      const searchTerm = benefitsSearchTerm
                        .trim()
                        .toLowerCase();

                      const filtered = benefitsApplicants.filter((applicant) => {
                        const applicantName = applicant.applicant
                          ? `${applicant.applicant.first_name || ""} ${
                              applicant.applicant.last_name || ""
                            }`
                              .trim()
                              .toLowerCase()
                          : (applicant.employee_name || "").toLowerCase();

                        const applicantEmail = (
                          applicant.applicant?.email ||
                          applicant.employee_email ||
                          ""
                        ).toLowerCase();

                        if (!searchTerm) {
                          return true;
                        }

                        return (
                          applicantName.includes(searchTerm) ||
                          applicantEmail.includes(searchTerm)
                        );
                      });

                      const departmentFiltered = filtered.filter((applicant) => {
                        if (benefitsDepartmentFilter === "All") {
                          return true;
                        }

                        const department =
                          applicant.jobPosting?.department ||
                          applicant.job_posting?.department ||
                          "";

                        return department === benefitsDepartmentFilter;
                      });

                      const positionFiltered = departmentFiltered.filter(
                        (applicant) => {
                          if (benefitsPositionFilter === "All") {
                            return true;
                          }

                          const position =
                            applicant.jobPosting?.position ||
                            applicant.job_posting?.position ||
                            "";

                          return position === benefitsPositionFilter;
                        }
                      );

                      const statusFiltered = positionFiltered.filter((applicant) => {
                        if (benefitsStatusFilter === "All") {
                          return true;
                        }

                        const status =
                          applicant.benefits_enrollment_status || "pending";

                        return status === benefitsStatusFilter;
                      });

                      const finalList = statusFiltered;

                      if (finalList.length === 0) {
                        return (
                          <div className="card border-0 shadow-sm">
                            <div className="card-body text-center py-5">
                              <h5 className="text-muted mb-2">
                                No Employees in Benefits Enrollment
                              </h5>

                              <p className="text-muted mb-0">
                                Once document verification is completed, employees
                                will appear here for benefits coordination.
                              </p>
                            </div>
                          </div>
                        );
                      }

                      const statusCounts = finalList.reduce(
                        (acc, applicant) => {
                          const status = (
                            applicant.benefits_enrollment_status || "pending"
                          ).toLowerCase();

                          if (status === "completed") {
                            acc.completed += 1;
                          } else if (status === "in_progress") {
                            acc.inProgress += 1;
                          } else {
                            acc.pending += 1;
                          }

                          return acc;
                        },
                        { pending: 0, completed: 0, inProgress: 0 }
                      );

                      return (
                        <>
                          <div className="card border-0 shadow-sm mb-3">
                            <div className="card-body d-flex flex-wrap gap-3 align-items-center justify-content-between">
                              <div>
                                <h6 className="mb-1">Enrollment Status Overview</h6>
                                <p className="text-muted small mb-0">
                                  Monitor applicant progress and address pending enrollments promptly.
                                </p>
                              </div>
                              <div className="d-flex flex-wrap gap-2">
                                <div className="d-flex align-items-center gap-2 px-3 py-2 bg-light rounded">
                                  <Badge bg="warning" text="dark">
                                    Pending
                                  </Badge>
                                  <span className="fw-semibold">{statusCounts.pending}</span>
                                </div>
                                <div className="d-flex align-items-center gap-2 px-3 py-2 bg-light rounded">
                                  <Badge bg="primary">In Progress</Badge>
                                  <span className="fw-semibold">{statusCounts.inProgress}</span>
                                </div>
                                <div className="d-flex align-items-center gap-2 px-3 py-2 bg-light rounded">
                                  <Badge bg="success">Completed</Badge>
                                  <span className="fw-semibold">{statusCounts.completed}</span>
                                </div>
                              </div>
                            </div>
                          </div>

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
                                      Employee
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
                                      Benefits Enrollment
                                    </th>

                                    <th
                                      style={{
                                        padding: "16px",
                                        fontWeight: 600,
                                        color: "#495057",
                                      }}
                                    >
                                      Actions
                                    </th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {finalList.map((applicant) => {
                                    const applicantName = applicant.applicant
                                      ? `${applicant.applicant.first_name || ""} ${
                                          applicant.applicant.last_name || ""
                                        }`.trim()
                                      : applicant.employee_name || "N/A";

                                    const applicantEmail =
                                      applicant.applicant?.email ||
                                      applicant.employee_email ||
                                      "N/A";

                                    const department =
                                      applicant.jobPosting?.department ||
                                      applicant.job_posting?.department ||
                                      "N/A";

                                    const position =
                                      applicant.jobPosting?.position ||
                                      applicant.job_posting?.position ||
                                      "";

                                    const benefitsStatus =
                                      applicant.benefits_enrollment_status ||
                                      "pending";

                                    const benefitsStatusLabel = benefitsStatus
                                      .split("_")
                                      .map((segment) =>
                                        segment.length > 0
                                          ? segment[0].toUpperCase() +
                                            segment.slice(1)
                                          : segment
                                      )
                                      .join(" ");

                                    let benefitsBadgeVariant = "info";
                                    if (benefitsStatus === "completed") {
                                      benefitsBadgeVariant = "success";
                                    } else if (
                                      benefitsStatus === "assigned" ||
                                      benefitsStatus === "in_progress"
                                    ) {
                                      benefitsBadgeVariant = "primary";
                                    }

                                    return (
                                      <tr
                                        key={applicant.id}
                                        style={{
                                          borderBottom: "1px solid #e9ecef",
                                          cursor: "pointer",
                                        }}
                                        role="button"
                                        onClick={() => handleEnrollBenefits(applicant)}
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
                                            <Badge
                                              bg={benefitsBadgeVariant}
                                              className="px-3 py-2"
                                              style={{
                                                fontSize: "0.8rem",
                                                borderRadius: "999px",
                                              }}
                                            >
                                              {benefitsStatusLabel || "Pending"}
                                            </Badge>

                                          </div>
                                        </td>

                                        <td
                                          style={{
                                            padding: "16px",
                                            verticalAlign: "middle",
                                          }}
                                        >
                                          <div className="d-flex flex-wrap gap-2">
                                            <Button
                                              variant="success"
                                              size="sm"
                                              style={{ borderRadius: "6px" }}
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                handleEnrollBenefits(applicant);
                                              }}
                                            >
                                              Enroll Benefits
                                            </Button>
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
                        </>
                      );
                    })()}
                  </>
                )}

                {/* Placeholder for upcoming onboarding subtabs */}

                {onboardingSubtab === "Profile Creation" ? (
                  (() => {
                    // Get all hired applicants who are not in the queue
                    const hiredApplicants = applicants
                      .filter((app) => app.status === "Hired")
                      .map((app) => {
                        const applicantName = app.applicant
                          ? `${app.applicant.first_name || ""} ${app.applicant.last_name || ""}`.trim()
                          : app.employee_name || app.name || "N/A";
                        const applicantEmail = app.applicant?.email || app.employee_email || app.email || "N/A";
                        const department = app.jobPosting?.department || app.job_posting?.department || "N/A";
                        const position = app.jobPosting?.position || app.job_posting?.position || "N/A";
                        
                        return {
                          id: app.id,
                          name: applicantName,
                          email: applicantEmail,
                          department: department,
                          position: position,
                          enrollmentStatus: "completed",
                          isHired: true,
                          applicant: app,
                        };
                      })
                      .filter((hired) => !profileCreationQueue.some((queueEntry) => queueEntry.id === hired.id));

                    // Combine queue entries and hired applicants
                    const allProfileEntries = [...profileCreationQueue, ...hiredApplicants];

                    if (allProfileEntries.length === 0) {
                      return (
                        <div className="card border-0 shadow-sm">
                          <div className="card-body text-center py-5">
                            <h5 className="text-muted mb-2">Profile Creation</h5>

                            <p className="text-muted mb-0">
                              Mark an applicant as complete from the Benefits Enrollment modal to queue them here for profile setup.
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
                                    Status
                                  </th>
                                  <th
                                    style={{
                                      padding: "16px",
                                      fontWeight: 600,
                                      color: "#495057",
                                    }}
                                  >
                                    Create Profile
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {allProfileEntries.map((entry) => {
                                // Check if applicant is hired
                                const isHired = entry.isHired || (() => {
                                  const applicant = applicants.find((app) => app.id === entry.id);
                                  return applicant?.status === "Hired";
                                })();
                                
                                const normalizedStatus = (entry.enrollmentStatus || "pending").toString();
                                const statusLabel = normalizedStatus
                                  .split("_")
                                  .map((segment) =>
                                    segment.length > 0
                                      ? segment[0].toUpperCase() + segment.slice(1)
                                      : segment
                                  )
                                  .join(" ");

                                let statusVariant = "warning";
                                if (normalizedStatus === "completed") {
                                  statusVariant = "success";
                                } else if (normalizedStatus === "in_progress") {
                                  statusVariant = "primary";
                                }

                                const hasProfileData = Boolean(
                                  entry.profileDataUpdatedAt
                                );
                                const profileButtonLabel = hasProfileData
                                  ? "Edit Personal Info"
                                  : "Create Profile";

                                // Get profile photo from various sources
                                const profilePhotoUrl = isHired && entry.applicant
                                  ? normalizeAssetUrl(
                                      entry.applicant.applicant?.profile_photo_url ||
                                      entry.applicant.employee_profile?.profile_photo_url ||
                                      entry.profileData?.profilePhotoUrl
                                    ) || PROFILE_PLACEHOLDER_IMAGE
                                  : normalizeAssetUrl(
                                      entry.profileData?.profilePhotoUrl
                                    ) || PROFILE_PLACEHOLDER_IMAGE;

                                return (
                                  <tr key={entry.id}>
                                    <td
                                      style={{
                                        padding: "16px",
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      <div className="d-flex align-items-center gap-3">
                                        <div
                                          style={{
                                            width: "56px",
                                            height: "56px",
                                            borderRadius: "12px",
                                            overflow: "hidden",
                                            border:
                                              "1px solid rgba(148, 163, 184, 0.3)",
                                            backgroundColor: "#f8fafc",
                                            flexShrink: 0,
                                          }}
                                        >
                                          <img
                                            src={profilePhotoUrl}
                                            alt={`${entry.name} profile`}
                                            style={{
                                              width: "100%",
                                              height: "100%",
                                              objectFit: "cover",
                                            }}
                                            onError={(event) => {
                                              if (event?.target) {
                                                event.target.onerror = null;
                                                event.target.src =
                                                  PROFILE_PLACEHOLDER_IMAGE;
                                              }
                                            }}
                                          />
                                        </div>
                                        <div>
                                          <div className="fw-semibold">
                                            {entry.name}
                                          </div>
                                          <div className="small text-muted">
                                            {entry.email}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td
                                      style={{
                                        padding: "16px",
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      <div style={{ color: "#495057" }}>
                                        {entry.department}
                                      </div>
                                      {entry.position && (
                                        <div
                                          className="text-muted small"
                                          style={{ fontStyle: "italic" }}
                                        >
                                          {entry.position}
                                        </div>
                                      )}
                                    </td>
                                    <td
                                      style={{
                                        padding: "16px",
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      {isHired ? (
                                        <Badge
                                          bg="success"
                                          className="px-3 py-2"
                                          style={{ borderRadius: "999px" }}
                                        >
                                          Hired
                                        </Badge>
                                      ) : (
                                        <Badge
                                          bg={statusVariant}
                                          className="px-3 py-2"
                                          style={{ borderRadius: "999px" }}
                                        >
                                          {statusLabel}
                                        </Badge>
                                      )}
                                    </td>
                                    <td
                                      style={{
                                        padding: "16px",
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      {isHired ? (
                                        <span className="text-muted small">Profile Created</span>
                                      ) : (
                                        <Button
                                          variant={hasProfileData ? "outline-primary" : "primary"}
                                          size="sm"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            handleOpenProfileCreationModal(entry);
                                          }}
                                        >
                                          {profileButtonLabel}
                                        </Button>
                                      )}
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
                  })()
                ) : ["Orientation Schedule", "Start Date"].includes(
                  onboardingSubtab
                ) && (
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
                                  isOfferSent(applicant)
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
                                disabled={isOfferSent(applicant)}
                              >
                                {isOfferSent(applicant)
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
                            activeTab !== "Accepted Offer" && (
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

              <div className="px-1 px-md-4 pb-3">
                <Card className="border-0 shadow-sm mb-3">
                  <Card.Body>
                    <h6 className="fw-bold mb-3">Interview Schedule</h6>
                    {interviewSchedulePreview.isScheduled ? (
                      <div className="row g-3">
                        <div className="col-md-4">
                          <div className="text-muted small text-uppercase mb-1">
                            Date
                          </div>
                          <div className="fw-semibold">
                            {interviewSchedulePreview.dateLabel}
                          </div>
                        </div>

                        <div className="col-md-4">
                          <div className="text-muted small text-uppercase mb-1">
                            Time
                          </div>
                          <div className="fw-semibold">
                            {interviewSchedulePreview.timeLabel}
                          </div>
                        </div>

                        <div className="col-md-4">
                          <div className="text-muted small text-uppercase mb-1">
                            Interviewer
                          </div>
                          <div className="fw-semibold">
                            {interviewSchedulePreview.interviewerName}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Alert variant="info" className="mb-0">
                        <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                        {interviewSchedulePreview.message}
                      </Alert>
                    )}
                  </Card.Body>
                </Card>

                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <h6 className="fw-bold mb-3">
                      Interview Details &amp; Instructions
                    </h6>
                    <p className="text-muted small mb-2">
                      Share these reminders with the applicant together with the
                      schedule.
                    </p>
                    <ul className="mb-0 ps-3">
                      {interviewInstructionItems.map((item, index) => (
                        <li key={`${item}-${index}`} className="mb-1">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </Card.Body>
                </Card>
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
                  variant="warning"
                  onClick={() => handleSendInterviewInvite({ mode: "reschedule" })}
                >
                  <FontAwesomeIcon icon={faRefresh} className="me-2" />
                  Re-schedule
                </Button>

                <Button
                  variant="success"
                  onClick={() => handleSendInterviewInvite({ mode: "submit" })}
                  className="px-4"
                >
                  <FontAwesomeIcon icon={faCheck} className="me-2" />
                  Submit Interview
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}

      {showStatusModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Change Application Status</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowStatusModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                {selectedRecordForStatus && (
                  <div>
                    <p className="mb-3">
                      <strong>Applicant:</strong>{" "}
                      {selectedRecordForStatus.applicant
                        ? `${selectedRecordForStatus.applicant.first_name} ${selectedRecordForStatus.applicant.last_name}`
                        : "N/A"}
                      <br />
                      <strong>Position:</strong>{" "}
                      {selectedRecordForStatus.jobPosting?.position ||
                        selectedRecordForStatus.job_posting?.position ||
                        "N/A"}
                      <br />
                      <strong>Current Status:</strong>{" "}
                      {selectedRecordForStatus.status}
                    </p>

                    <p className="text-muted mb-4">
                      Select the new status for this application:
                    </p>

                    <div className="d-grid gap-2">
                      {selectedRecordForStatus.status === "Pending" && (
                        <>
                          <Button
                            variant="success"
                            size="lg"
                            onClick={() => handleStatusUpdate("ShortListed")}
                            className="d-flex align-items-center justify-content-center"
                          >
                            <FontAwesomeIcon
                              icon={faCheckCircle}
                              className="me-2"
                            />
                            Move to Shortlisted
                          </Button>

                          <Button
                            variant="danger"
                            size="lg"
                            onClick={() => handleStatusUpdate("Rejected")}
                            className="d-flex align-items-center justify-content-center"
                          >
                            <FontAwesomeIcon
                              icon={faTimesCircle}
                              className="me-2"
                            />
                            Move to Rejected
                          </Button>
                        </>
                      )}

                      {(selectedRecordForStatus.status ===
                        "On going Interview" ||
                        selectedRecordForStatus.status === "Interview") && (
                        <>
                          <Button
                            variant="success"
                            size="lg"
                            onClick={() => handleStatusUpdate("Offered")}
                            className="d-flex align-items-center justify-content-center"
                          >
                            <FontAwesomeIcon
                              icon={faCheckCircle}
                              className="me-2"
                            />
                            Accepted - Move to Job Offer
                          </Button>

                          <Button
                            variant="danger"
                            size="lg"
                            onClick={() => handleStatusUpdate("Rejected")}
                            className="d-flex align-items-center justify-content-center"
                          >
                            <FontAwesomeIcon
                              icon={faTimesCircle}
                              className="me-2"
                            />
                            Rejected
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <Button
                  variant="secondary"
                  onClick={() => setShowStatusModal(false)}
                >
                  Cancel
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

                      stage: "general",
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

                  <div className="mb-0 mt-2">
                    <span className="badge bg-primary rounded-pill fs-6">
                      {selectedApplicants.length}
                    </span>
                  </div>
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
                  {documentModalReadOnly ? "Documents" : "View / Verify Documents"}{" "}
                  -{" "}
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
                  onClick={closeDocumentModal}
                ></button>
              </div>

              <div className="modal-body p-4">
                {/* Tabs */}

                <div className="d-flex flex-wrap gap-2 mb-4 border-bottom">
                  {visibleDocumentTabs.map((tab) => (
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
                      {!documentModalReadOnly && allDocumentsApproved() && (
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
                    documentModalReadOnly ? (
                      additionalRequirementDocs.length > 0 ? (
                        renderDocumentCards(additionalRequirementDocs)
                      ) : (
                        <div className="card border-0 shadow-sm">
                          <div className="card-body text-center py-4 text-muted small">
                            No additional documents were requested for this
                            applicant.
                          </div>
                        </div>
                      )
                    ) : (
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
                                  id="additional-doc-required"
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
                                  htmlFor="additional-doc-required"
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
                            applicant will appear here for review once
                            submitted.
                          </div>
                        </div>
                      )}
                    </>
                  )) : documentModalTab === "Follow-Up Requests" ? (
                    documentModalReadOnly ? null : (
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
                    )
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

                {documentModalTab !== "Applicant Identification" &&
                  rejectingSubmissionId && (
                    <div
                      className="modal show d-block"
                      tabIndex="-1"
                      style={{
                        backgroundColor: "rgba(0,0,0,0.3)",
                        zIndex: 1060,
                      }}
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

                                setRejectionReason("");
                              }}
                            ></button>
                          </div>

                          <div className="modal-body">
                            <p className="mb-3">
                              Please provide a reason for rejecting this
                              document. The employee will be notified to
                              re-upload.
                            </p>

                            <label className="form-label fw-semibold">
                              Rejection Reason *
                            </label>

                            <textarea
                              className="form-control"
                              rows="3"
                              placeholder="e.g., Blurry photo, please re-upload"
                              value={rejectionReason}
                              onChange={(e) =>
                                setRejectionReason(e.target.value)
                              }
                              style={{ minHeight: "100px" }}
                            />
                          </div>

                          <div className="modal-footer border-0">
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setRejectingSubmissionId(null);

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
                    onClick={closeDocumentModal}
                  >
                    Close
                  </Button>

                  {allDocumentsApproved() && !isDocumentSubmissionCompleted() && (
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
    <Modal.Header closeButton style={{ borderBottom: "none" }} className="px-4 px-lg-5 pt-4">
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
                  <Form.Group controlId="staffFollowUpExtensionDays">
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
                  <Form.Group controlId="staffFollowUpHrResponse" className="mt-3">
                    <Form.Label>Message to Applicant *</Form.Label>
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
                      required
                    />
                  </Form.Group>
                </Form>
              )}

              {followUpActionType === "reject" && (
                <Form>
                  <Form.Group controlId="staffFollowUpRejectMessage">
                    <Form.Label>Message to Applicant *</Form.Label>
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
                      required
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
                disabled={
                  followUpActionLoading || !followUpActionForm.hrResponse.trim()
                }
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

      {showBenefitsModal && (
        <Modal
          show={showBenefitsModal}
          onHide={handleCloseBenefitsModal}
          size="lg"
          centered
          backdrop="static"
        >
          <Modal.Header closeButton>
            <Modal.Title>Benefits Enrollment</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {benefitsModalLoading ? (
              <div className="d-flex justify-content-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <>
                {benefitsApplicantInfo && (
                  <Card className="border-0 shadow-sm mb-4">
                    <Card.Body>
                      <Row className="gy-3">
                        <Col md={6}>
                          <div className="text-muted small">Applicant</div>
                          <div className="fw-semibold">
                            {benefitsApplicantInfo.name || "N/A"}
                          </div>
                        </Col>
                        <Col md={6}>
                          <div className="text-muted small">Email</div>
                          <div className="fw-semibold">
                            {benefitsApplicantInfo.email || "N/A"}
                          </div>
                        </Col>
                        <Col md={6}>
                          <div className="text-muted small">Position</div>
                          <div className="fw-semibold">
                            {benefitsApplicantInfo.position || "N/A"}
                          </div>
                        </Col>
                        <Col md={6}>
                          <div className="text-muted small">Department</div>
                          <div className="fw-semibold">
                            {benefitsApplicantInfo.department || "N/A"}
                          </div>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                )}

                <Form>
                  <Row className="gy-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">
                          Enrollment Status
                        </Form.Label>
                        <Form.Select
                          value={benefitsEnrollmentStatus}
                          onChange={(e) =>
                            setBenefitsEnrollmentStatus(e.target.value)
                          }
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row className="gy-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>SSS Number</Form.Label>
                        <Form.Control
                          type="text"
                          value={benefitsForm.sssNumber}
                          onChange={(e) =>
                            handleBenefitFieldChange("sssNumber", e.target.value)
                          }
                          placeholder="Enter SSS number"
                          disabled={!benefitsEditable}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>PhilHealth Number</Form.Label>
                        <Form.Control
                          type="text"
                          value={benefitsForm.philhealthNumber}
                          onChange={(e) =>
                            handleBenefitFieldChange(
                              "philhealthNumber",
                              e.target.value
                            )
                          }
                          placeholder="Enter PhilHealth number"
                          disabled={!benefitsEditable}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Pag-IBIG Number</Form.Label>
                        <Form.Control
                          type="text"
                          value={benefitsForm.pagibigNumber}
                          onChange={(e) =>
                            handleBenefitFieldChange(
                              "pagibigNumber",
                              e.target.value
                            )
                          }
                          placeholder="Enter Pag-IBIG number"
                          disabled={!benefitsEditable}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Date of Enrollment</Form.Label>
                        <Form.Control
                          type="date"
                          value={benefitsForm.enrollmentDate}
                          onChange={(e) =>
                            handleBenefitFieldChange(
                              "enrollmentDate",
                              e.target.value
                            )
                          }
                          disabled={!benefitsEditable}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                </Form>

                <div className="d-flex flex-wrap justify-content-between align-items-center mt-4">
                      <div className="text-muted small">
                    Use Complete to queue the applicant for Profile Creation while keeping them listed here.
                      </div>
                  <div className="d-flex flex-wrap gap-2">
                    <Button
                      variant="success"
                      onClick={handleQueueForProfileCreation}
                      disabled={
                        benefitsSaving ||
                        benefitsModalLoading ||
                        !selectedApplicationForBenefits
                      }
                    >
                      <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                      Complete
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={handleCloseBenefitsModal}
              disabled={benefitsSaving}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      <Modal
        show={benefitsValidationErrors.length > 0 && showBenefitsModal}
        onHide={() => setBenefitsValidationErrors([])}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Validation Error</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">Please complete required fields or correct errors.</p>
          <ul className="mb-0">
            {benefitsValidationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setBenefitsValidationErrors([])}>
            Got it
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showBenefitsSubmitConfirm}
        onHide={() => setShowBenefitsSubmitConfirm(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Submit Benefits Enrollment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to submit this benefits enrollment? Once submitted,
          the enrollment status will be marked as completed.
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowBenefitsSubmitConfirm(false)}
            disabled={benefitsSaving}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleConfirmBenefitsSubmit}
            disabled={benefitsSaving}
          >
            Confirm Submit
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={profileCreationModalVisible}
        onHide={handleCloseProfileCreationModal}
        centered
        size="xl"
        contentClassName="border-0 overflow-hidden rounded-4"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Personal Information{" "}
            {activeProfileCreationEntry ? `- ${activeProfileCreationEntry.name}` : ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={PROFILE_MODAL_BODY_STYLE} className="px-4 px-lg-5 pb-5">
          <div style={PROFILE_MODAL_CONTAINER_STYLE}>
            <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between mb-4 gap-4">
              <div className="d-flex align-items-start gap-3">
                <div style={PROFILE_PHOTO_BOX_STYLE}>
                  <img
                    src={displayedProfilePhotoUrl}
                    alt={`${
                      profileCreationForm.fullName ||
                      activeProfileCreationEntry?.name ||
                      "Applicant"
                    } profile`}
                    style={PROFILE_PHOTO_IMAGE_STYLE}
                    onError={handleProfilePhotoError}
                  />
                </div>
                <div>
                  <span style={PROFILE_HEADER_BADGE_STYLE}>Profile Creation</span>
                  <h3 className="mt-3 mb-1 text-dark fw-semibold">
                    Applicant Personal Profile
                  </h3>
                  <p className="text-muted mb-0">
                    Review and confirm the applicant details before saving.
                  </p>
                </div>
              </div>
              {activeProfileCreationEntry?.name ? (
                <div className="mt-3 mt-lg-0 text-lg-end">
                  <div className="fw-semibold text-dark">
                    {activeProfileCreationEntry.name}
                  </div>
                  {activeProfileCreationEntry.position ||
                  activeProfileCreationEntry.department ? (
                    <div className="text-muted small">
                      {[activeProfileCreationEntry.position, activeProfileCreationEntry.department]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

          <Form>
              {renderProfileSection(
                "Personal Information",
                "Key personal details submitted by the applicant.",
              <Row className="gy-3">
                <Col md={6}>
                  <Form.Group controlId="profileFullName">
                      <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                        Full Name
                      </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.fullName}
                      readOnly
                      placeholder="Auto-filled full name"
                      style={PROFILE_READONLY_INPUT_STYLE}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="profileNickname">
                      <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                        Nickname
                      </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.nickname}
                      onChange={(e) =>
                          handleProfileCreationInputChange(
                            "nickname",
                            e.target.value
                          )
                      }
                      placeholder="Enter nickname"
                      style={PROFILE_INPUT_STYLE}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="profileCivilStatus">
                      <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                        Civil Status
                      </Form.Label>
                    <Form.Select
                      value={profileCreationForm.civilStatus}
                      onChange={(e) =>
                        handleProfileCreationInputChange(
                          "civilStatus",
                          e.target.value
                        )
                      }
                      style={PROFILE_INPUT_STYLE}
                      required
                    >
                      <option value="">Select Civil Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="profileGender">
                      <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                        Gender
                      </Form.Label>
                    <Form.Select
                      value={profileCreationForm.gender}
                      onChange={(e) =>
                          handleProfileCreationInputChange(
                            "gender",
                            e.target.value
                          )
                      }
                        style={PROFILE_INPUT_STYLE}
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="profileDateOfBirth">
                      <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                        Date of Birth
                      </Form.Label>
                    <Form.Control
                      type="date"
                      value={profileCreationForm.dateOfBirth}
                      onChange={(e) =>
                        handleProfileCreationInputChange(
                          "dateOfBirth",
                          e.target.value
                        )
                      }
                        style={PROFILE_INPUT_STYLE}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="profileAge">
                      <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                        Age
                      </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.age}
                      readOnly
                      placeholder="Auto-calculated age"
                        style={PROFILE_READONLY_INPUT_STYLE}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              )}

              {renderProfileSection(
                "Contact Information",
                "Emergency contacts and ways to reach the applicant.",
              <Row className="gy-3">
                <Col md={4}>
                  <Form.Group controlId="profileCompanyEmail">
                    <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                      Company Email
                    </Form.Label>
                    <Form.Control
                      type="email"
                      value={profileCreationForm.companyEmail}
                      readOnly
                      placeholder="Auto-generated company email"
                      style={PROFILE_READONLY_INPUT_STYLE}
                    />
                    <div className="text-muted small mt-1">
                      Generated from the applicant&apos;s name.
                    </div>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="profilePhoneNumber">
                    <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                      Phone Number
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.phoneNumber}
                      onChange={(e) =>
                        handleProfileCreationInputChange(
                          "phoneNumber",
                          e.target.value
                        )
                      }
                      placeholder="Enter phone number"
                      style={PROFILE_INPUT_STYLE}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="profileEmergencyContactName">
                    <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                      Emergency Contact Name
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.emergencyContactName}
                      onChange={(e) =>
                        handleProfileCreationInputChange(
                          "emergencyContactName",
                          e.target.value
                        )
                      }
                      placeholder="Enter emergency contact name"
                      style={PROFILE_INPUT_STYLE}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="profileEmergencyContactPhone">
                    <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                      Emergency Contact Phone
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.emergencyContactPhone}
                      onChange={(e) =>
                        handleProfileCreationInputChange(
                          "emergencyContactPhone",
                          e.target.value
                        )
                      }
                      placeholder="Enter emergency contact phone"
                      style={PROFILE_INPUT_STYLE}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              )}

              {renderProfileSection(
                "Address Information",
                "Residential details used for records and logistics.",
              <Row className="gy-3">
                <Col md={3}>
                  <Form.Group controlId="profileProvince">
                      <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                        Province
                      </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.province}
                      onChange={(e) =>
                          handleProfileCreationInputChange(
                            "province",
                            e.target.value
                          )
                      }
                      placeholder="Enter province"
                        style={PROFILE_INPUT_STYLE}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="profileBarangay">
                      <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                        Barangay
                      </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.barangay}
                      onChange={(e) =>
                          handleProfileCreationInputChange(
                            "barangay",
                            e.target.value
                          )
                      }
                      placeholder="Enter barangay"
                        style={PROFILE_INPUT_STYLE}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="profileCity">
                      <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                        City / Municipality
                      </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.city}
                      onChange={(e) =>
                        handleProfileCreationInputChange("city", e.target.value)
                      }
                      placeholder="Enter city or municipality"
                        style={PROFILE_INPUT_STYLE}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="profilePostalCode">
                      <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                        Postal Code
                      </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.postalCode}
                      onChange={(e) =>
                          handleProfileCreationInputChange(
                            "postalCode",
                            e.target.value
                          )
                      }
                      placeholder="Enter postal code"
                        style={PROFILE_INPUT_STYLE}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group controlId="profilePresentAddress">
                      <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                        Present Address
                      </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={profileCreationForm.presentAddress}
                      onChange={(e) =>
                        handleProfileCreationInputChange(
                          "presentAddress",
                          e.target.value
                        )
                      }
                      placeholder="Enter present address"
                        style={PROFILE_TEXTAREA_STYLE}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              )}

              {renderProfileSection(
                "Employment Information",
                "Placement details for onboarding and payroll.",
              <Row className="gy-3">
                <Col md={4}>
                  <Form.Group controlId="profilePosition">
                      <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                        Position
                      </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.position}
                      readOnly
                      placeholder="Auto-filled position"
                        style={PROFILE_READONLY_INPUT_STYLE}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="profileDepartment">
                      <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                        Department
                      </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.department}
                      readOnly
                      placeholder="Auto-filled department"
                        style={PROFILE_READONLY_INPUT_STYLE}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="profileEmploymentStatus">
                      <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                        Employment Status
                      </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.employmentStatus}
                      onChange={(e) =>
                        handleProfileCreationInputChange(
                          "employmentStatus",
                          e.target.value
                        )
                      }
                      placeholder="Enter employment status"
                        style={PROFILE_INPUT_STYLE}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="profileDateStarted">
                      <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                        Date Started
                      </Form.Label>
                    <Form.Control
                      type="date"
                      value={profileCreationForm.dateStarted}
                      onChange={(e) =>
                          handleProfileCreationInputChange(
                            "dateStarted",
                            e.target.value
                          )
                      }
                        style={PROFILE_INPUT_STYLE}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="profileSalary">
                      <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                        Salary
                      </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.salary}
                      onChange={(e) =>
                        handleProfileCreationInputChange("salary", e.target.value)
                      }
                      placeholder="Enter salary"
                        style={PROFILE_INPUT_STYLE}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="profileTenure">
                      <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                        Tenure
                      </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.tenure}
                      onChange={(e) =>
                        handleProfileCreationInputChange("tenure", e.target.value)
                      }
                      placeholder="Enter tenure"
                        style={PROFILE_INPUT_STYLE}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              )}

              {renderProfileSection(
                "Government Identifications",
                "Sourced automatically from the applicant's Document Submission stage.",
                <>
                  <div className="text-muted small mb-3">
                    These identifiers are view-only to preserve data integrity.
                  </div>
              <Row className="gy-3">
                <Col md={3}>
                  <Form.Group controlId="profileSss">
                        <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                          SSS
                        </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.sss}
                          readOnly
                          placeholder="Auto-filled from documents"
                          style={PROFILE_READONLY_INPUT_STYLE}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="profilePhilhealth">
                        <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                          PhilHealth
                        </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.philhealth}
                          readOnly
                          placeholder="Auto-filled from documents"
                          style={PROFILE_READONLY_INPUT_STYLE}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="profilePagibig">
                        <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                          Pag-IBIG
                        </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.pagibig}
                          readOnly
                          placeholder="Auto-filled from documents"
                          style={PROFILE_READONLY_INPUT_STYLE}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="profileTin">
                        <Form.Label className={PROFILE_LABEL_CLASSNAME}>
                          TIN
                        </Form.Label>
                    <Form.Control
                      type="text"
                      value={profileCreationForm.tin}
                          readOnly
                          placeholder="Auto-filled from documents"
                          style={PROFILE_READONLY_INPUT_STYLE}
                    />
                  </Form.Group>
                </Col>
              </Row>
                </>
              )}
          </Form>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseProfileCreationModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveProfileCreationForm}
            disabled={profileCreationSaving}
          >
            {profileCreationSaving ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Saving...
              </>
            ) : (
              "Save Personal Info"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

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
                  <Form.Group controlId="staffFollowUpExtensionDays">
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
                  <Form.Group controlId="staffFollowUpHrResponse" className="mt-3">
                    <Form.Label>Message to Applicant *</Form.Label>
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
                      required
                    />
                  </Form.Group>
                </Form>
              )}

              {followUpActionType === "reject" && (
                <Form>
                  <Form.Group controlId="staffFollowUpRejectMessage">
                    <Form.Label>Message to Applicant *</Form.Label>
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
                      required
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
                disabled={
                  followUpActionLoading || !followUpActionForm.hrResponse.trim()
                }
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

export default Onboarding;
