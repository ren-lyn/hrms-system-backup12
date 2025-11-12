import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";

import axios from "axios";

import { Card, Button, Badge, Alert, Form, Modal } from "react-bootstrap";

import {
  validateDocumentUpload,
  formatFileSize,
} from "../utils/OnboardingValidation";

import OnboardingToast from "./OnboardingToast";

import OnboardingLoading from "./OnboardingLoading";

import OnboardingStatusBadge from "./OnboardingStatusBadge";

import "../styles/OnboardingStyles.css";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  faFileAlt,
  faCheckCircle,
  faClock,
  faExclamationTriangle,
  faUpload,
  faDownload,
  faCalendarAlt,
  faUser,
  faBuilding,
  faRocket,
  faStar,
  faGem,
  faAward,
  faIdCard,
  faGraduationCap,
  faStethoscope,
  faFileContract,
  faCamera,
  faSignature,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faMagic,
  faLightbulb,
  faChartLine,
  faTimesCircle,
  faFilePdf,
  faImage,
  faFileImage,
  faUserCheck,
  faClipboardCheck,
  faBriefcase,
  faUserTie,
  faGift,
  faTrophy,
  faTimes,
  faEye,
  faShieldAlt,
  faDollarSign,
  faHome,
  faHeartbeat,
  faBell,
  faUsers,
  faCalendarCheck,
  faListAlt,
  faSave,
  faMoneyBillWave,
  faCreditCard,
  faFileMedical,
  faUserMd,
  faHospital,
  faAmbulance,
  faPills,
  faInfoCircle,
  faSearch,
  faRefresh,
} from "@fortawesome/free-solid-svg-icons";

const DOCUMENT_SECTIONS = [
  {
    id: "personal-identification",

    title: "Personal Identification & Background",

    description:
      "Please upload clear scanned copies or photos of each requirement.",

    documents: [
      {
        id: "governmentId",

        label: "Valid Government ID",

        helperText: "Passport, Driver's License, UMID, or National ID",

        isRequired: true,
      },

      {
        id: "birthCertificate",

        label: "Birth Certificate (PSA)",

        helperText:
          "Official PSA-issued certificate for age and identity verification",

        isRequired: true,
      },

      {
        id: "resume",

        label: "Resume / Curriculum Vitae (CV)",

        helperText: "Latest copy detailing your education and work experience",

        isRequired: true,
      },

      {
        id: "diploma",

        label: "Diploma / Transcript of Records (TOR)",

        helperText: "Proof of educational attainment",

        isRequired: true,
      },

      {
        id: "photo",

        label: "2x2 or Passport-size Photo",

        helperText:
          "For company ID and personnel records (plain background preferred)",

        isRequired: true,
      },

      {
        id: "employmentCertificate",

        label: "Certificate of Employment / Recommendation Letters",

        helperText: "Proof of past work experience or references",

        isRequired: true,
      },

      {
        id: "nbiClearance",

        label: "NBI or Police Clearance",

        helperText: "Issued within the last six (6) months",

        isRequired: true,
      },

      {
        id: "barangayClearance",

        label: "Barangay Clearance",

        helperText: "Proof of good moral character and residency",

        isRequired: true,
      },
    ],
  },

  {
    id: "government-benefits",

    title: "Government Benefits & Tax Documents",

    description:
      "Upload copies or screenshots showing your official membership numbers.",

    documents: [
      {
        id: "sssDocument",

        label: "SSS Number",

        helperText:
          "Scan or screenshot of your SSS E-1/E-4 form or ID showing the number",

        isRequired: true,
      },

      {
        id: "philhealthDocument",

        label: "PhilHealth Number",

        helperText: "Copy of your PhilHealth ID or MDR with visible number",

        isRequired: true,
      },

      {
        id: "pagibigDocument",

        label: "Pag-IBIG MID Number",

        helperText: "Document showing your Pag-IBIG MID/RTN number",

        isRequired: true,
      },

      {
        id: "tinDocument",

        label: "TIN (Tax Identification Number)",

        helperText: "BIR Form 1902/1905 or any document showing your TIN",

        isRequired: true,
      },
    ],
  },

  {
    id: "medical-health",

    title: "Medical & Health",

    description:
      "Ensure documents are clear, legible, and issued by an accredited clinic or health professional.",

    documents: [
      {
        id: "medicalCertificate",

        label: "Medical Certificate / Fit-to-Work Clearance",

        helperText: "Issued by a licensed doctor or accredited clinic",

        isRequired: true,
      },

      {
        id: "vaccinationRecords",

        label: "Vaccination Records",

        helperText: "If required by the company or job role",

        isRequired: true,
      },
    ],
  },
];

const DOCUMENT_STATUS_CONFIG = {
  not_submitted: {
    label: "Not Submitted",

    variant: "secondary",

    description: "Document not uploaded yet",
  },

  under_review: {
    label: "Under Review",

    variant: "warning",

    description: "Awaiting HR review",
  },

  resubmission_required: {
    label: "Resubmit",

    variant: "danger",

    description: "Please upload a new copy",
  },

  approved: {
    label: "Approved",

    variant: "success",

    description: "Document accepted by HR",
  },
};

const DOCUMENT_STATUS_STORAGE_KEY = "personalOnboardingDocumentStatuses";
const GOOGLE_WEATHER_API_KEY =
  process.env.REACT_APP_GOOGLE_WEATHER_API_KEY ||
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
  "";

const GOVERNMENT_ID_FIELD_MAP = {
  sssDocument: {
    field: "sss_number",
    label: "SSS Number",
    placeholder: "Enter your SSS Number",
  },
  philhealthDocument: {
    field: "philhealth_number",
    label: "PhilHealth Number",
    placeholder: "Enter your PhilHealth Number",
  },
  pagibigDocument: {
    field: "pagibig_number",
    label: "Pag-IBIG MID Number",
    placeholder: "Enter your Pag-IBIG MID Number",
  },
  tinDocument: {
    field: "tin_number",
    label: "TIN (Tax Identification Number)",
    placeholder: "Enter your TIN",
  },
};

const DEFAULT_GOVERNMENT_ID_NUMBERS = {
  sssDocument: "",
  philhealthDocument: "",
  pagibigDocument: "",
  tinDocument: "",
};

const BENEFITS_CARD_CONFIG = [
  {
    id: "benefit-sss",
    documentKey: "sssDocument",
    title: "SSS Membership",
    subtitle: "Social Security System",
    icon: faShieldAlt,
  },
  {
    id: "benefit-philhealth",
    documentKey: "philhealthDocument",
    title: "PhilHealth Coverage",
    subtitle: "Philippine Health Insurance",
    icon: faHeartbeat,
  },
  {
    id: "benefit-pagibig",
    documentKey: "pagibigDocument",
    title: "Pag-IBIG Fund",
    subtitle: "Home Development Mutual Fund",
    icon: faHome,
  },
  {
    id: "benefit-tin",
    documentKey: "tinDocument",
    title: "TIN Registration",
    subtitle: "Bureau of Internal Revenue",
    icon: faFileContract,
  },
];

const PersonalOnboarding = () => {
  const [onboardingData, setOnboardingData] = useState(null);

  const [uploadingDocumentKey, setUploadingDocumentKey] = useState(null);

  const [jobOfferData, setJobOfferData] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);

  const [selectedDocument, setSelectedDocument] = useState(null);

  const [uploadErrors, setUploadErrors] = useState({});

  const [governmentIdNumbers, setGovernmentIdNumbers] = useState(
    () => ({ ...DEFAULT_GOVERNMENT_ID_NUMBERS })
  );

  const [attendanceConfirmed, setAttendanceConfirmed] = useState(false);

  const [showProfileModal, setShowProfileModal] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const [showDeclineModal, setShowDeclineModal] = useState(false);

  const [declineReason, setDeclineReason] = useState("");

  const [showApplicationModal, setShowApplicationModal] = useState(false);

  const [userApplications, setUserApplications] = useState([]);

  const [loadingApplications, setLoadingApplications] = useState(false);

  const [orientationData, setOrientationData] = useState(null);

  const [orientationChecklist, setOrientationChecklist] = useState([
    {
      id: 1,
      task: "Confirm Attendance",
      completed: false,
      icon: faCheckCircle,
    },

    {
      id: 2,
      task: "Prepare Valid Government ID",
      completed: false,
      icon: faIdCard,
    },

    {
      id: 3,
      task: "Review Company Handbook",
      completed: false,
      icon: faFileAlt,
    },

    {
      id: 4,
      task: "Prepare Questions for HR",
      completed: false,
      icon: faLightbulb,
    },

    {
      id: 5,
      task: "Ensure Stable Internet Connection (if online)",
      completed: false,
      icon: faBuilding,
    },
  ]);

  const [attendanceStatus, setAttendanceStatus] = useState(null); // null, 'confirmed', 'declined'

  // Notification state management

  const [notifications, setNotifications] = useState([]);

  const [showNotificationDropdown, setShowNotificationDropdown] =
    useState(false);

  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Interview data state

  const [interviewData, setInterviewData] = useState([]);

  const [loadingInterview, setLoadingInterview] = useState(false);

  const [acceptingOffer, setAcceptingOffer] = useState(false);

  // New state for multi-page system

  const [currentPage, setCurrentPage] = useState("status");

  const [activeTab, setActiveTab] = useState("documents");

  // All tabs are always available

  const availableTabs = [
    "status",
    "interview",
    "offer",
    "onboarding",
    "application-status",
  ];

  const [documentUploads, setDocumentUploads] = useState({});

  const [documentPreviews, setDocumentPreviews] = useState({});

  const documentPreviewsRef = useRef({});

  const additionalRequirementsSectionRef = useRef(null);
  const documentFieldRefs = useRef({});

  const [documentOverview, setDocumentOverview] = useState({
    documents: [],

    status_counts: {},

    last_updated_at: null,
  });

  const [documentOverviewMeta, setDocumentOverviewMeta] = useState({
    statusCounts: {
      approved: 0,

      pending: 0,

      rejected: 0,

      not_submitted: 0,
    },

    lastUpdatedAt: null,
    submissionWindow: null,
    submissionLocked: false,
  });

  const [documentLoading, setDocumentLoading] = useState(false);

  const [documentError, setDocumentError] = useState("");

  const [applicantName, setApplicantName] = useState("Applicant");
  const [applicantAvatarUrl, setApplicantAvatarUrl] = useState("");
  const [weatherInfo, setWeatherInfo] = useState({
    loading: true,
    temperature: null,
    condition: "",
    location: "",
    observedAt: null,
    source: null,
  });
  const [weatherError, setWeatherError] = useState(null);

  const [showFollowUpModal, setShowFollowUpModal] = useState(false);

  const [followUpTargetDocument, setFollowUpTargetDocument] = useState(null);

  const [followUpMessage, setFollowUpMessage] = useState("");

  const [followUpAttachment, setFollowUpAttachment] = useState(null);

  const [followUpError, setFollowUpError] = useState("");

  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);

  const overviewStatusBadges = useMemo(
    () => [
      { key: "approved", label: "Received", variant: "success" },

      { key: "pending", label: "Pending", variant: "warning" },

      { key: "rejected", label: "Rejected", variant: "danger" },

      { key: "not_submitted", label: "Not Submitted", variant: "secondary" },
    ],
    []
  );

  const formattedCurrentDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const welcomeName = useMemo(() => {
    const trimmedName = (applicantName || "").trim();
    return trimmedName.length > 0 ? trimmedName : "Applicant";
  }, [applicantName]);

  const weatherSummary = useMemo(() => {
    if (weatherInfo.loading || weatherError) {
      return "";
    }

    const hasTemperature =
      typeof weatherInfo.temperature === "number" &&
      Number.isFinite(weatherInfo.temperature);

    const parts = [];

    if (hasTemperature) {
      parts.push(`${Math.round(weatherInfo.temperature)}°C`);
    }

    if (weatherInfo.condition && weatherInfo.condition.length > 0) {
      parts.push(weatherInfo.condition);
    }

    let summary = parts.join(" ").trim();

    if (weatherInfo.location && weatherInfo.location.length > 0) {
      summary = `${summary}${summary.length > 0 ? " " : ""}in ${
        weatherInfo.location
      }`.trim();
    }

    return summary;
  }, [weatherError, weatherInfo]);

  const weatherDisplayText = weatherInfo.loading
    ? "Fetching local weather..."
    : weatherSummary;

  const generateAvatarFallback = useCallback((name) => {
    const safeName = (name || "Applicant").trim() || "Applicant";
    return `https://ui-avatars.com/api/?background=2563EB&color=ffffff&bold=true&name=${encodeURIComponent(
      safeName
    )}`;
  }, []);

  const resolveAvatarUrl = useCallback((user) => {
    if (!user || typeof user !== "object") return null;

    const candidateKeys = [
      "profile_picture_url",
      "profilePictureUrl",
      "profile_photo_url",
      "profilePhotoUrl",
      "avatar_url",
      "avatar",
      "photo_url",
      "photo",
      "image_url",
      "image",
      "profile_photo_path",
      "profilePicture",
    ];

    for (const key of candidateKeys) {
      const value = user?.[key];
      if (!value || typeof value !== "string") continue;

      const trimmed = value.trim();
      if (!trimmed) continue;

      if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
        return trimmed;
      }

      if (trimmed.startsWith("/storage/") || trimmed.startsWith("storage/")) {
        const baseUrl =
          process.env.REACT_APP_API_BASE_URL ||
          process.env.REACT_APP_BACKEND_URL ||
          (typeof window !== "undefined" ? window.location.origin : "");

        const normalizedBase =
          baseUrl && baseUrl.endsWith("/") ? baseUrl : `${baseUrl || ""}/`;

        const normalizedPath = trimmed.replace(/^\/+/, "");

        return `${normalizedBase}${normalizedPath}`;
      }
    }

    return null;
  }, []);

  const displayedAvatarUrl = useMemo(() => {
    if (applicantAvatarUrl && applicantAvatarUrl.length > 0) {
      return applicantAvatarUrl;
    }

    return generateAvatarFallback(welcomeName);
  }, [applicantAvatarUrl, generateAvatarFallback, welcomeName]);

  const handleAvatarError = useCallback(
    (event) => {
      if (!event || !event.target) return;
      event.target.onerror = null;
      event.target.src = generateAvatarFallback(welcomeName);
    },
    [generateAvatarFallback, welcomeName]
  );

  const primaryApplication = useMemo(
    () =>
      userApplications && userApplications.length > 0
        ? userApplications[0]
        : null,
    [userApplications]
  );

  const applicationStages = useMemo(
    () => [
      "Application",
      "Under Review",
      "Shortlisted",
      "Interview",
      "Offer",
      "Onboarding",
      "Hired",
    ],
    []
  );

  const statusToStageMap = useMemo(
    () => ({
      application: "Application",
      pending: "Under Review",
      "under review": "Under Review",
      under_review: "Under Review",
      shortlisted: "Shortlisted",
      "short listed": "Shortlisted",
      short_listed: "Shortlisted",
      interview: "Interview",
      interviewed: "Interview",
      offered: "Offer",
      offer: "Offer",
      accepting: "Offer",
      accepted: "Onboarding",
      onboarding: "Onboarding",
      hired: "Hired",
      completed: "Hired",
      rejected: "Application",
      declined: "Under Review",
    }),
    []
  );

  const normalizedApplicationStatus = useMemo(() => {
    if (!primaryApplication?.status) {
      return "";
    }

    return primaryApplication.status.toString().trim().toLowerCase();
  }, [primaryApplication?.status]);

  const currentStageLabel = useMemo(() => {
    if (!primaryApplication) {
      return "Application";
    }

    return statusToStageMap[normalizedApplicationStatus] || "Application";
  }, [normalizedApplicationStatus, primaryApplication, statusToStageMap]);

  const currentStageIndex = useMemo(() => {
    const index = applicationStages.indexOf(currentStageLabel);
    return index >= 0 ? index : 0;
  }, [applicationStages, currentStageLabel]);

  const stageProgressPercent = useMemo(() => {
    if (applicationStages.length <= 1) {
      return 0;
    }

    const clampedIndex = Math.min(
      Math.max(currentStageIndex, 0),
      applicationStages.length - 1
    );

    if (clampedIndex === 0) {
      return 0;
    }

    const percent =
      (clampedIndex / (applicationStages.length - 1)) * 100;

    return Number.isFinite(percent) ? percent : 0;
  }, [applicationStages, currentStageIndex]);

  const applicationLastUpdatedDisplay = useMemo(() => {
    if (!primaryApplication) return null;

    const candidates = [
      { key: "status_updated_at_ph", value: primaryApplication.status_updated_at_ph },
      { key: "updated_at_ph", value: primaryApplication.updated_at_ph },
      { key: "status_updated_at", value: primaryApplication.status_updated_at },
      { key: "updated_at", value: primaryApplication.updated_at },
      { key: "last_updated_at", value: primaryApplication.last_updated_at },
      { key: "applied_at_ph", value: primaryApplication.applied_at_ph },
      { key: "applied_at", value: primaryApplication.applied_at },
    ];

    for (const candidate of candidates) {
      if (
        typeof candidate.value === "string" &&
        candidate.value.trim().length > 0
      ) {
        if (/_ph$|_formatted$/i.test(candidate.key)) {
          return candidate.value.trim();
        }

        const parsed = new Date(candidate.value);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.toLocaleString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
        }

        return candidate.value;
      }
    }

    return null;
  }, [primaryApplication]);

  const greetingSubtext = useMemo(() => {
    if (applicationLastUpdatedDisplay) {
      return `Last updated on ${applicationLastUpdatedDisplay}`;
    }

    return "We'll keep you posted as soon as there are new updates.";
  }, [applicationLastUpdatedDisplay]);

  const currentStatusConfig = useMemo(() => {
    if (!primaryApplication) {
      return {
        title: "No Application Yet",
        titleClass: "text-secondary",
        icon: faFileAlt,
        iconColor: "#4b5563",
        iconBackground: "rgba(107, 114, 128, 0.18)",
        message: "You haven't submitted any job applications yet.",
        subtext:
          "Apply to a role to start tracking your progress and receiving updates here.",
        nextStep: "Browse available positions and submit your application to get started.",
        badgeLabel: "No Application",
        badgeClass: "badge rounded-pill bg-secondary",
        appliedDate: null,
      };
    }

    const statusRaw = primaryApplication.status || "Pending";
    const status = statusRaw.toString().trim().toLowerCase();
    const appliedDate =
      primaryApplication.applied_at_ph ||
      primaryApplication.applied_at ||
      null;

    const baseConfig = {
      badgeLabel: statusRaw,
      appliedDate,
    };

    switch (status) {
      case "pending":
      case "under review":
      case "under_review":
        return {
          ...baseConfig,
          title: "Under Review",
          titleClass: "text-warning",
          icon: faClock,
          iconColor: "#f97316",
          iconBackground: "rgba(249, 115, 22, 0.15)",
          message: "Your application is being reviewed by our HR team.",
          subtext: "We will notify you of any updates within 3-5 business days.",
          nextStep:
            "If selected, you will be contacted for an interview within the next week.",
          badgeClass: "badge rounded-pill bg-warning text-dark",
        };
      case "shortlisted":
      case "short listed":
      case "short_listed":
        return {
          ...baseConfig,
          title: "Shortlisted",
          titleClass: "text-primary",
          icon: faCheckCircle,
          iconColor: "#2563eb",
          iconBackground: "rgba(37, 99, 235, 0.15)",
          message:
            "Congratulations! You have been shortlisted for the next phase.",
          subtext: "You will be contacted for the next steps soon.",
          nextStep: "Prepare for the interview and gather your documents.",
          badgeClass: "badge rounded-pill bg-primary",
        };
      case "interview":
      case "interviewed":
        return {
          ...baseConfig,
          title: "Interview Scheduled",
          titleClass: "text-info",
          icon: faCalendarAlt,
          iconColor: "#0ea5e9",
          iconBackground: "rgba(14, 165, 233, 0.18)",
          message:
            "You have been selected for an interview. Please prepare accordingly.",
          subtext: "Interview details will be shared with you shortly.",
          nextStep: "Attend the interview at the scheduled time and location.",
          badgeClass: "badge rounded-pill bg-info text-dark",
        };
      case "offered":
      case "offer":
      case "accepting":
        return {
          ...baseConfig,
          title: "Job Offer Extended",
          titleClass: "text-success",
          icon: faGift,
          iconColor: "#22c55e",
          iconBackground: "rgba(34, 197, 94, 0.18)",
          message:
            "We are pleased to offer you the position. Please review the offer details.",
          subtext: "Please respond to the offer within the specified timeframe.",
          nextStep: "Review the offer details and respond within the deadline.",
          badgeClass: "badge rounded-pill bg-success",
        };
      case "onboarding":
      case "accepted":
        return {
          ...baseConfig,
          title: "Onboarding in Progress",
          titleClass: "text-info",
          icon: faUser,
          iconColor: "#0ea5e9",
          iconBackground: "rgba(14, 165, 233, 0.15)",
          message:
            "You're almost there! We're preparing your onboarding experience.",
          subtext:
            "Check your onboarding tasks to complete any pending requirements.",
          nextStep:
            "Review your onboarding checklist and complete any outstanding items.",
          badgeClass: "badge rounded-pill bg-info text-dark",
        };
      case "hired":
      case "completed":
        return {
          ...baseConfig,
          title: "Congratulations! Hired",
          titleClass: "text-success",
          icon: faUser,
          iconColor: "#16a34a",
          iconBackground: "rgba(22, 163, 74, 0.18)",
          message: "Welcome to the team! Your application has been successful.",
          subtext:
            "Welcome aboard! HR will contact you with onboarding details.",
          nextStep:
            "Complete the onboarding process and prepare for your first day.",
          badgeClass: "badge rounded-pill bg-success",
        };
      case "rejected":
      case "declined":
        return {
          ...baseConfig,
          title: "Application Not Selected",
          titleClass: "text-danger",
          icon: faTimes,
          iconColor: "#ef4444",
          iconBackground: "rgba(239, 68, 68, 0.18)",
          message:
            "We regret to inform you that your application was not selected at this time.",
          subtext: "You may reapply for other positions in the future.",
          nextStep: "Consider applying for other available positions.",
          badgeClass: "badge rounded-pill bg-danger",
        };
      default:
        return {
          ...baseConfig,
          title: "Application In Progress",
          titleClass: "text-primary",
          icon: faChartLine,
          iconColor: "#2563eb",
          iconBackground: "rgba(37, 99, 235, 0.12)",
          message: "Your application is progressing smoothly.",
          subtext: "We'll update you the moment there are new developments.",
          nextStep:
            "Keep an eye on your notifications for the next steps from our team.",
          badgeClass: "badge rounded-pill bg-primary",
        };
    }
  }, [primaryApplication]);
  const getWeatherDescription = useCallback((code, fallbackText = "") => {
    const stringMapping = {
      clear: "Clear Skies",
      clear_sky: "Clear Skies",
      clear_skies: "Clear Skies",
      mostly_clear: "Mostly Clear",
      partly_cloudy: "Partly Cloudy",
      mostly_cloudy: "Mostly Cloudy",
      overcast: "Overcast",
      fog: "Foggy",
      foggy: "Foggy",
      mist: "Foggy",
      haze: "Hazy",
      drizzle: "Drizzle",
      light_drizzle: "Light Drizzle",
      heavy_drizzle: "Heavy Drizzle",
      light_rain: "Light Rain",
      rain: "Rainy",
      rainy: "Rainy",
      heavy_rain: "Heavy Rain",
      freezing_rain: "Freezing Rain",
      sleet: "Sleet",
      snow: "Snow",
      light_snow: "Light Snow",
      heavy_snow: "Heavy Snow",
      snow_showers: "Snow Showers",
      hail: "Storm with Hail",
      thunderstorm: "Thunderstorm",
      thunderstorm_with_rain: "Thunderstorm",
      thunderstorm_with_hail: "Storm with Hail",
      severe_thunderstorm: "Severe Storm",
      storm: "Stormy",
    };

    if (typeof code === "string" && code.length > 0) {
      const normalizedCode = code
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .replace(/[^a-zA-Z]+/g, "_")
        .toLowerCase()
        .replace(/^_+|_+$/g, "");

      if (normalizedCode && stringMapping[normalizedCode]) {
        return stringMapping[normalizedCode];
      }
    }

    const mapping = {
      0: "Clear Skies",
      1: "Mostly Clear",
      2: "Partly Cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Rime Fog",
      51: "Light Drizzle",
      53: "Drizzle",
      55: "Heavy Drizzle",
      56: "Freezing Drizzle",
      57: "Dense Freezing Drizzle",
      61: "Light Rain",
      63: "Rainy",
      65: "Heavy Rain",
      66: "Light Freezing Rain",
      67: "Freezing Rain",
      71: "Light Snow",
      73: "Snow",
      75: "Heavy Snow",
      77: "Snow Grains",
      80: "Light Showers",
      81: "Showers",
      82: "Heavy Showers",
      85: "Snow Showers",
      86: "Heavy Snow Showers",
      95: "Thunderstorm",
      96: "Storm with Hail",
      99: "Severe Storm",
    };

    const numericCode =
      typeof code === "string" ? Number.parseInt(code, 10) : code;

    if (Number.isFinite(numericCode) && mapping[numericCode]) {
      return mapping[numericCode];
    }

    return fallbackText || "Weather unavailable";
  }, []);

  const normalizeDocumentLabel = useCallback((value) => {
    if (!value || typeof value !== "string") return "";

    return value.toLowerCase().replace(/\s+/g, " ").trim();
  }, []);

  const standardDocumentLabelMap = useMemo(() => {
    const map = {};

    DOCUMENT_SECTIONS.forEach((section) => {
      section.documents.forEach((document) => {
        const normalized = normalizeDocumentLabel(
          document.label || document.id
        );

        if (normalized && document.id) {
          map[normalized] = document.id;
        }
      });
    });

    return map;
  }, [normalizeDocumentLabel]);

  const resolveStandardDocumentKey = useCallback(
    (label) => {
      const normalized = normalizeDocumentLabel(label);

      if (!normalized) return null;

      if (standardDocumentLabelMap[normalized]) {
        return standardDocumentLabelMap[normalized];
      }

      const partialMatch = Object.entries(standardDocumentLabelMap).find(
        ([knownLabel]) =>
          knownLabel === normalized ||
          normalized.includes(knownLabel) ||
          knownLabel.includes(normalized)
      );

      return partialMatch ? partialMatch[1] : null;
    },

    [normalizeDocumentLabel, standardDocumentLabelMap]
  );

  const defaultDocumentStatuses = useMemo(() => {
    const baseStatuses = {};

    DOCUMENT_SECTIONS.forEach((section) => {
      section.documents.forEach((document) => {
        baseStatuses[document.id] = "not_submitted";
      });
    });

    return baseStatuses;
  }, []);

  const [documentStatuses, setDocumentStatuses] = useState(() => {
    if (typeof window === "undefined") return defaultDocumentStatuses;

    try {
      const saved = JSON.parse(
        localStorage.getItem(DOCUMENT_STATUS_STORAGE_KEY) || "{}"
      );

      const sanitizedStatuses = { ...defaultDocumentStatuses, ...saved };

      if (sanitizedStatuses.resume === "under_review") {
        sanitizedStatuses.resume = "not_submitted";
      }

      return sanitizedStatuses;
    } catch (error) {
      console.error("Error loading document statuses:", error);

      return defaultDocumentStatuses;
    }
  });

  const [activeAdditionalRequirementKey, setActiveAdditionalRequirementKey] =
    useState(null);

  const [showAdditionalRequirementModal, setShowAdditionalRequirementModal] =
    useState(false);

  const totalDocumentCount = DOCUMENT_SECTIONS.reduce(
    (count, section) => count + section.documents.length,

    0
  );

  const normalizeNameValue = (value) => {
    if (!value || typeof value !== "string") return "";

    const trimmed = value.trim();

    if (!trimmed || trimmed.toLowerCase() === "n/a") return "";

    return trimmed;
  };

  const normalizeEmailValue = (value) => {
    if (!value || typeof value !== "string") return "";

    const trimmed = value.trim();

    if (!trimmed || trimmed.toLowerCase() === "n/a") return "";

    return trimmed;
  };

  const resolveApplicantDisplayName = (userData = {}, applications = []) => {
    const first =
      typeof userData.first_name === "string" ? userData.first_name.trim() : "";

    const last =
      typeof userData.last_name === "string" ? userData.last_name.trim() : "";

    const candidates = [
      normalizeNameValue(userData.full_name),

      normalizeNameValue(userData.name),

      normalizeNameValue(`${first} ${last}`),
    ];

    if (Array.isArray(applications) && applications.length > 0) {
      const primaryApplication = applications[0] ?? {};

      candidates.push(normalizeNameValue(primaryApplication.applicant_name));

      if (primaryApplication.applicant) {
        const appFirst =
          typeof primaryApplication.applicant.first_name === "string"
            ? primaryApplication.applicant.first_name.trim()
            : "";

        const appLast =
          typeof primaryApplication.applicant.last_name === "string"
            ? primaryApplication.applicant.last_name.trim()
            : "";

        candidates.push(normalizeNameValue(`${appFirst} ${appLast}`));
      }
    }

    const validCandidate = candidates.find(Boolean);

    return validCandidate || "";
  };

  const showToast = useCallback((type, title, message) => {
    setToast({ show: true, type, title, message });
  }, []);

  const hideToast = useCallback(() => {
    setToast({ show: false, type: "success", title: "", message: "" });
  }, []);

  const handleAcceptOffer = () => {
    // Prevent double-clicks

    if (acceptingOffer) {
      console.log("Already processing offer acceptance...");

      return;
    }

    confirmAcceptOffer();
  };

  const handleDeclineOffer = () => {
    setShowDeclineModal(true);
  };

  const confirmAcceptOffer = async () => {
    // Prevent double submission

    if (acceptingOffer) {
      return;
    }

    try {
      setAcceptingOffer(true);

      const token = localStorage.getItem("token");

      const applicationId =
        userApplications && userApplications[0] && userApplications[0].id
          ? userApplications[0].id
          : null;

      console.log("🔍 Accept Offer - Application ID:", applicationId);

      console.log("🔍 Accept Offer - Token:", token ? "Present" : "Missing");

      console.log("🔍 Accept Offer - User Applications:", userApplications);

      if (!applicationId) {
        console.error("❌ Missing application ID");

        showToast(
          "error",
          "Error",
          "No application found. Please refresh the page and try again."
        );

        setAcceptingOffer(false);

        return;
      }

      if (!token) {
        console.error("❌ Missing authentication token");

        showToast("error", "Authentication Error", "Please log in again.");

        setAcceptingOffer(false);

        return;
      }

      let success = false;

      let responseData = null;

      // Try dedicated endpoint first

      try {
        console.log("📤 Calling accept-offer endpoint...");

        const response = await axios.post(
          `http://localhost:8000/api/applications/${applicationId}/accept-offer`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("✅ Accept offer response:", response.data);

        responseData = response.data;

        success = true;
      } catch (e) {
        console.log(
          "⚠️ Dedicated endpoint failed:",
          e.response?.data || e.message
        );

        // Fallback to generic status update

        try {
          console.log("📤 Trying fallback status update...");

          const response = await axios.put(
            `http://localhost:8000/api/applications/${applicationId}/status`,
            {
              status: "Offer Accepted",
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          console.log("✅ Status update response:", response.data);

          responseData = response.data;

          success = true;
        } catch (fallbackError) {
          console.error(
            "❌ Both endpoints failed:",
            fallbackError.response?.data || fallbackError.message
          );

          throw fallbackError;
        }
      }

      if (success) {
        // Local UI feedback

        showToast(
          "success",
          "Offer Accepted",
          "Thank you for joining us! HR will contact you soon."
        );

        // Optimistically update local application status

        setUserApplications((prev) => {
          if (!prev || prev.length === 0) return prev;

          const updated = [...prev];

          updated[0] = { ...updated[0], status: "Offer Accepted" };

          return updated;
        });

        console.log("✅ Offer accepted successfully!");
      }
    } catch (error) {
      console.error("❌ Error accepting offer:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to accept the offer. Please try again.";

      showToast("error", "Error", errorMessage);
    } finally {
      setAcceptingOffer(false);
    }
  };

  const confirmDeclineOffer = async () => {
    try {
      const token = localStorage.getItem("token");

      const applicationId =
        userApplications && userApplications[0] && userApplications[0].id
          ? userApplications[0].id
          : null;

      if (!applicationId || !token) {
        console.error("Missing application ID or token");

        setShowDeclineModal(false);

        showToast(
          "error",
          "Error",
          "Unable to process offer decline. Please try again."
        );

        return;
      }

      let success = false;

      // Try dedicated endpoint first

      try {
        const response = await axios.post(
          `http://localhost:8000/api/applications/${applicationId}/decline-offer`,
          {
            reason: declineReason,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("Decline offer response:", response.data);

        success = true;
      } catch (e) {
        console.log(
          "Dedicated endpoint failed, trying fallback:",
          e.response?.data || e.message
        );

        // Fallback to generic status update

        try {
          const response = await axios.put(
            `http://localhost:8000/api/applications/${applicationId}/status`,
            {
              status: "Rejected",

              reason: declineReason,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          console.log("Status update response:", response.data);

          success = true;
        } catch (fallbackError) {
          console.error(
            "Both endpoints failed:",
            fallbackError.response?.data || fallbackError.message
          );

          throw fallbackError;
        }
      }

      if (success) {
        setShowDeclineModal(false);

        showToast("info", "Offer Declined", "Your response has been recorded.");

        // Optimistically update local application status

        setUserApplications((prev) =>
          prev && prev.length > 0
            ? [{ ...prev[0], status: "Rejected" }, ...prev.slice(1)]
            : prev
        );

        setDeclineReason("");
      }
    } catch (error) {
      console.error("Error declining offer:", error);

      setShowDeclineModal(false);

      showToast(
        "error",
        "Error",
        "Failed to decline the offer. Please try again."
      );
    }
  };

  // Fetch notifications from backend

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);

      const token = localStorage.getItem("token");

      const response = await axios.get(
        "http://localhost:8000/api/notifications",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Transform backend notifications to match our format

      const transformedNotifications = response.data.data.map((notif) => ({
        id: notif.id,

        title: notif.title,

        message: notif.message,

        time: getRelativeTime(notif.created_at),

        read: notif.read_at !== null,

        selected: false,

        type: notif.type,

        application_id: notif.application_id,

        created_at: notif.created_at,
      }));

      setNotifications(transformedNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Helper function to get relative time

  const getRelativeTime = (timestamp) => {
    const now = new Date();

    const date = new Date(timestamp);

    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";

    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;

    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;

    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  };

  const getDocumentLabel = (documentKey) => {
    for (const section of DOCUMENT_SECTIONS) {
      const match = section.documents.find(
        (document) => document.id === documentKey
      );

      if (match) {
        return match.label;
      }
    }

    const additionalDoc = documentDataMap[documentKey];

    if (additionalDoc?.document_name) {
      return additionalDoc.document_name;
    }

    return documentKey;
  };

  const handleDocumentChange = (documentKey, file) => {
    if (!file) {
      return;
    }

    const { isValid, errors } = validateDocumentUpload(file);

    if (!isValid) {
      const errorMessage =
        Object.values(errors).join(". ") ||
        "Please upload a PDF, JPG, or PNG file under 5MB.";

      setUploadErrors((prev) => ({
        ...prev,

        [documentKey]: errorMessage,
      }));

      setDocumentUploads((prev) => {
        const next = { ...prev };

        delete next[documentKey];

        return next;
      });

      setDocumentPreviews((prev) => {
        const next = { ...prev };

        if (next[documentKey]) {
          URL.revokeObjectURL(next[documentKey]);

          delete next[documentKey];
        }

        return next;
      });

      delete documentPreviewsRef.current[documentKey];

      setDocumentStatuses((prev) => ({
        ...prev,

        [documentKey]: "resubmission_required",
      }));

      showToast("error", "Invalid File", errorMessage);

      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setDocumentUploads((prev) => ({
      ...prev,

      [documentKey]: file,
    }));

    setUploadErrors((prev) => {
      const next = { ...prev };

      delete next[documentKey];

      return next;
    });

    setDocumentPreviews((prev) => {
      const next = { ...prev };

      if (next[documentKey]) {
        URL.revokeObjectURL(next[documentKey]);
      }

      next[documentKey] = previewUrl;

      return next;
    });

    documentPreviewsRef.current[documentKey] = previewUrl;

    showToast(
      "success",
      "Document Selected",
      `${getDocumentLabel(documentKey)} ready for submission.`
    );
  };

  const handleGovernmentIdChange = (documentKey, value) => {
    if (
      !documentKey ||
      !Object.prototype.hasOwnProperty.call(GOVERNMENT_ID_FIELD_MAP, documentKey)
    ) {
      return;
    }

    setGovernmentIdNumbers((prev) => ({
      ...prev,
      [documentKey]: value,
    }));
  };

  const activeApplicationId = useMemo(
    () =>
      userApplications && userApplications.length > 0
        ? userApplications[0].id
        : null,
    [userApplications]
  );

  const handleRemoveDocument = (documentKey) => {
    setDocumentUploads((prev) => {
      const next = { ...prev };

      delete next[documentKey];

      return next;
    });

    setUploadErrors((prev) => {
      const next = { ...prev };

      delete next[documentKey];

      return next;
    });

    setDocumentPreviews((prev) => {
      const next = { ...prev };

      if (next[documentKey]) {
        URL.revokeObjectURL(next[documentKey]);

        delete next[documentKey];
      }

      return next;
    });

    delete documentPreviewsRef.current[documentKey];

    showToast(
      "info",
      "Document Removed",
      `${getDocumentLabel(documentKey)} removed from submission.`
    );
  };

  const openRemoteSubmission = useCallback(
    async (submissionId, fileName = "document") => {
      if (!submissionId || !activeApplicationId) {
        return false;
      }

      const token = localStorage.getItem("token");

      if (!token) {
        showToast(
          "error",
          "Authentication Required",
          "Please log in again to preview this document."
        );

        return false;
      }

      const previewWindow =
        typeof window !== "undefined" ? window.open("", "_blank", "noopener") : null;

      if (previewWindow) {
        previewWindow.document.write(
          "<p style='font-family: sans-serif; padding: 24px;'>Loading document preview…</p>"
        );
      }

      try {
        const downloadUrl = `http://localhost:8000/api/applications/${activeApplicationId}/documents/submissions/${submissionId}/download`;

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

        if (previewWindow) {
          previewWindow.location.href = objectUrl;
        } else {
          const anchor = document.createElement("a");

          anchor.href = objectUrl;

          anchor.download = fileName || "document";

          document.body.appendChild(anchor);

          anchor.click();

          document.body.removeChild(anchor);
        }

        setTimeout(() => {
          window.URL.revokeObjectURL(objectUrl);
        }, 30000);

        return true;
      } catch (error) {
        console.error("Error opening submitted document:", error);

        if (previewWindow && !previewWindow.closed) {
          previewWindow.close();
        }

        showToast(
          "error",
          "Preview Failed",
          "We could not open that document. Please try again later."
        );

        return false;
      }
    },
    [activeApplicationId, showToast]
  );

  const handlePreviewDocument = (documentKey) => {
    const previewUrl =
      documentPreviewsRef.current[documentKey] || documentPreviews[documentKey];

    if (previewUrl && typeof window !== "undefined") {
      window.open(previewUrl, "_blank");

      return;
    }

    const remoteSubmission = documentDataMap[documentKey]?.submission;

    if (remoteSubmission && typeof window !== "undefined") {
      openRemoteSubmission(
        remoteSubmission.id,
        remoteSubmission.file_name || `${documentKey}.pdf`
      );

      return;
    }

    showToast(
      "info",
      "No Preview Available",
      `Please upload ${getDocumentLabel(
        documentKey
      )} before attempting to preview it.`
    );
  };

  const requiredDocumentKeys = DOCUMENT_SECTIONS.flatMap((section) =>
    section.documents
      .filter((document) => document.isRequired)
      .map((document) => document.id)
  );

  const documentDataMap = useMemo(() => {
    const map = {};

    (documentOverview.documents || []).forEach((doc) => {
      const derivedKey = doc.document_key || (doc.requirement_id ? `additional-${doc.requirement_id}` : null);

      if (derivedKey) {
        map[derivedKey] = {
          ...doc,
          document_key: derivedKey,
        };
      }
    });

    return map;
  }, [documentOverview]);

  const requirementIdsByDocumentKey = useMemo(() => {
    const map = {};

    Object.values(documentDataMap).forEach((doc) => {
      if (doc.document_key && doc.requirement_id) {
        map[doc.document_key] = doc.requirement_id;
      }
    });

    return map;
  }, [documentDataMap]);

  const standardDocumentKeys = useMemo(() => {
    const keys = new Set();

    DOCUMENT_SECTIONS.forEach((section) => {
      section.documents.forEach((document) => {
        keys.add(document.id);
      });
    });

    return keys;
  }, []);

  const mapStatusToLocal = useCallback((status) => {
    switch (status) {
      case "pending":
        return "under_review";

      case "received":
        return "approved";

      case "rejected":
        return "resubmission_required";

      default:
        return "not_submitted";
    }
  }, []);

  const handleOpenAdditionalRequirementModal = useCallback((documentKey) => {
    setActiveAdditionalRequirementKey(documentKey);
    setShowAdditionalRequirementModal(true);
  }, []);

  const handleCloseAdditionalRequirementModal = useCallback(() => {
    if (activeAdditionalRequirementKey) {
      const key = activeAdditionalRequirementKey;

      setUploadErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });

      setDocumentUploads((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });

      setDocumentPreviews((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        const previewUrl = next[key];
        if (previewUrl && typeof previewUrl === "string" && previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previewUrl);
        }
        delete next[key];
        return next;
      });

      if (documentPreviewsRef.current[key]) {
        const previewUrl = documentPreviewsRef.current[key];
        if (previewUrl && typeof previewUrl === "string" && previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previewUrl);
        }
        delete documentPreviewsRef.current[key];
      }
    }

    setShowAdditionalRequirementModal(false);
    setActiveAdditionalRequirementKey(null);
  }, [activeAdditionalRequirementKey]);

  const handleAdditionalRequirementFileChange = (event) => {
    if (!activeAdditionalRequirementKey) {
      return;
    }

    const file = event.target.files?.[0] || null;

    if (file) {
      handleDocumentChange(activeAdditionalRequirementKey, file);
    }

    if (event.target) {
      event.target.value = "";
    }
  };

  const handleAdditionalRequirementSubmit = async (event) => {
    if (event) {
      event.preventDefault();
    }

    if (!activeAdditionalRequirementKey) {
      showToast(
        "error",
        "No Requirement Selected",
        "Please choose a requirement before submitting."
      );
      return;
    }

    if (!additionalRequirementCanUpload) {
      showToast(
        "error",
        "Uploads Locked",
        additionalRequirementLockReason ||
          "Uploads for this requirement are currently locked."
      );
      return;
    }

    const wasSuccessful = await handleSubmitDocument(
      activeAdditionalRequirementKey
    );

    if (wasSuccessful) {
      handleCloseAdditionalRequirementModal();
    }
  };

  const setDocumentFieldRef = useCallback((documentKey, node) => {
    if (!documentKey) {
      return;
    }

    if (node) {
      documentFieldRefs.current[documentKey] = node;
    } else {
      delete documentFieldRefs.current[documentKey];
    }
  }, []);

  const handleAdditionalRequirementSelection = useCallback(
    (documentKey) => {
      if (!documentKey) {
        return;
      }

      setCurrentPage("onboarding");
      setActiveTab("documents");
      handleOpenAdditionalRequirementModal(documentKey);

      window.setTimeout(() => {
        const target = additionalRequirementsSectionRef.current;

        if (!target) {
          return;
        }

        const mainContent = document.querySelector(".main-content");

        if (mainContent) {
          const targetRect = target.getBoundingClientRect();
          const containerRect = mainContent.getBoundingClientRect();
          const offset =
            targetRect.top - containerRect.top + mainContent.scrollTop - 24;

          mainContent.scrollTo({
            top: offset > 0 ? offset : 0,
            behavior: "smooth",
          });
        } else {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 50);
    },
    [handleOpenAdditionalRequirementModal]
  );

  const additionalRequirements = useMemo(() => {
    const collection = [];

    Object.values(documentDataMap).forEach((doc) => {
      if (!doc.document_key || !doc.requirement_id) {
        return;
      }

      if (standardDocumentKeys.has(doc.document_key)) {
        return;
      }

      const overviewStatus = doc.status ?? "not_submitted";

      const localStatusKey = mapStatusToLocal(overviewStatus);

      const statusConfig =
        DOCUMENT_STATUS_CONFIG[localStatusKey] ??
        DOCUMENT_STATUS_CONFIG.not_submitted;

      collection.push({
        documentKey: doc.document_key,
        requirementId: doc.requirement_id,
        title: doc.document_name || "Additional Requirement",
        description: doc.description || "",
        overviewStatus,
        statusKey: localStatusKey,
        statusLabel: doc.status_label || statusConfig.label,
        statusVariant: doc.status_badge || statusConfig.variant,
        submission: doc.submission || null,
        canUpload:
          typeof doc.can_upload === "boolean" ? doc.can_upload : true,
        lockUploads:
          typeof doc.lock_uploads === "boolean" ? doc.lock_uploads : false,
        submissionWindow: doc.submission_window || null,
        followUp: doc.follow_up || null,
      });
    });

    return collection.sort((a, b) => a.title.localeCompare(b.title));
  }, [documentDataMap, mapStatusToLocal, standardDocumentKeys]);

  const activeAdditionalRequirement = useMemo(() => {
    if (!activeAdditionalRequirementKey) {
      return null;
    }

    return additionalRequirements.find(
      (req) => req.documentKey === activeAdditionalRequirementKey
    ) || null;
  }, [activeAdditionalRequirementKey, additionalRequirements]);

  const activeAdditionalRequirementDoc = useMemo(() => {
    if (!activeAdditionalRequirementKey) {
      return null;
    }

    return documentDataMap[activeAdditionalRequirementKey] || null;
  }, [activeAdditionalRequirementKey, documentDataMap]);

  useEffect(() => {
    if (!showAdditionalRequirementModal || !activeAdditionalRequirementKey) {
      return;
    }

    const exists = additionalRequirements.some(
      (req) => req.documentKey === activeAdditionalRequirementKey
    );

    if (!exists) {
      setShowAdditionalRequirementModal(false);
      setActiveAdditionalRequirementKey(null);
    }
  }, [
    showAdditionalRequirementModal,
    activeAdditionalRequirementKey,
    additionalRequirements,
  ]);

  const applyDocumentOverview = useCallback(
    (overview) => {
      if (!overview) {
        return null;
      }

      const documentsList =
        Array.isArray(overview.documents) && overview.documents.length > 0
          ? overview.documents
          : Array.isArray(overview.documents_snapshot?.requirements)
          ? overview.documents_snapshot.requirements
          : [];

      const normalizedOverview = {
        ...overview,
        documents: documentsList,
      };

      setDocumentOverview(normalizedOverview);

      const newStatuses = { ...defaultDocumentStatuses };
      const remoteGovernmentIds = {};

      documentsList.forEach((doc) => {
        if (!doc.document_key) {
          return;
        }

        newStatuses[doc.document_key] = mapStatusToLocal(doc.status);

        const idConfig = GOVERNMENT_ID_FIELD_MAP[doc.document_key];
        if (idConfig) {
          const rawValue =
            doc.submission?.[idConfig.field] ??
            doc[idConfig.field] ??
            null;
          if (rawValue !== null && rawValue !== undefined) {
            const normalizedValue = String(rawValue).trim();
            if (normalizedValue !== "") {
              remoteGovernmentIds[doc.document_key] = normalizedValue;
            }
          }
        }
      });

      setDocumentStatuses(newStatuses);

      if (Object.keys(remoteGovernmentIds).length > 0) {
        setGovernmentIdNumbers((prev) => ({
          ...prev,
          ...remoteGovernmentIds,
        }));
      }

      const statusCountsSource =
        overview.status_counts && Object.keys(overview.status_counts).length > 0
          ? overview.status_counts
          : overview.documents_snapshot?.status_counts || {};

      const statusCounts = {
        approved: statusCountsSource?.received ?? 0,

        pending: statusCountsSource?.pending ?? 0,

        rejected: statusCountsSource?.rejected ?? 0,

        not_submitted: statusCountsSource?.not_submitted ?? 0,
      };

      setDocumentOverviewMeta({
        statusCounts,

        lastUpdatedAt: overview.last_updated_at || null,
        submissionWindow: overview.documents_submission_window || null,
        submissionLocked: Boolean(overview.documents_submission_locked),
      });

      setDocumentError("");

      return overview;
    },
    [defaultDocumentStatuses, mapStatusToLocal]
  );

  const resolveRequirementViaApi = useCallback(
    async (documentKey) => {
      if (!documentKey || !activeApplicationId) {
        return null;
      }

      const token = localStorage.getItem("token");

      if (!token) {
        showToast(
          "error",
          "Authentication Required",
          "Please log in again to continue."
        );

        return null;
      }

      try {
        const response = await axios.get(
          `http://localhost:8000/api/applications/${activeApplicationId}/documents/requirements/by-key/${documentKey}`,

          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const resolvedRequirement =
          response.data?.requirement ??
          response.data?.data?.requirement ??
          null;

        const overviewPayload =
          response.data?.overview ?? response.data?.data?.overview ?? null;

        if (overviewPayload) {
          applyDocumentOverview(overviewPayload);
        }

        return resolvedRequirement ?? null;
      } catch (error) {
        console.error("Error resolving requirement via API:", error);

        const message =
          error.response?.data?.message ??
          "Unable to prepare this document requirement right now. Please try again shortly.";

        showToast("error", "Document Not Ready", message);

        return null;
      }
    },
    [activeApplicationId, applyDocumentOverview, showToast]
  );

  const formatTimestampForDisplay = useCallback((value) => {
    if (!value) return "";

    try {
      return new Date(value).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",

        year: "numeric",

        month: "long",

        day: "numeric",

        hour: "2-digit",

        minute: "2-digit",
      });
    } catch (error) {
      return String(value);
    }
  }, []);

  const benefitsOverviewCards = useMemo(() => {
    return BENEFITS_CARD_CONFIG.map((config) => {
      const docData = documentDataMap[config.documentKey] || null;
      const statusKey = documentStatuses[config.documentKey] || "not_submitted";
      const isApproved = statusKey === "approved";
      const statusLabel = isApproved ? "Approved" : "Pending";
      const statusVariant = isApproved ? "success" : "warning";

      const idConfig = GOVERNMENT_ID_FIELD_MAP[config.documentKey] || null;
      const membershipNumberRaw = idConfig
        ? governmentIdNumbers[config.documentKey] ||
          docData?.submission?.[idConfig.field] ||
          docData?.[idConfig.field] ||
          ""
        : "";

      const normalizedMembership =
        membershipNumberRaw && String(membershipNumberRaw).trim() !== ""
          ? String(membershipNumberRaw).trim()
          : "";

      const hasMembershipNumber = normalizedMembership !== "";
      const membershipNumber = hasMembershipNumber
        ? normalizedMembership
        : "Not provided yet";

      const submittedAt =
        docData?.submission?.submitted_at
          ? formatTimestampForDisplay(docData.submission.submitted_at)
          : "";
      const reviewedAt =
        docData?.submission?.reviewed_at
          ? formatTimestampForDisplay(docData.submission.reviewed_at)
          : "";

      const hrRemarks =
        docData?.submission?.hr_response ||
        docData?.submission?.hr_note ||
        docData?.submission?.remarks ||
        docData?.hr_response ||
        docData?.hr_note ||
        "";

      const proofAvailable = Boolean(
        docData?.submission?.proof_url ||
          docData?.submission?.file_url ||
          docData?.submission?.file_name ||
          docData?.submission?.file_path
      );

      return {
        ...config,
        statusLabel,
        statusVariant,
        isApproved,
        hasMembershipNumber,
        membershipNumber,
        submittedAt,
        reviewedAt,
        hrRemarks,
        proofAvailable,
      };
    });
  }, [
    documentStatuses,
    documentDataMap,
    governmentIdNumbers,
    formatTimestampForDisplay,
  ]);

  const handleFollowUpSubmit = async (event = null) => {
    if (event) {
      event.preventDefault();
    }

    const trimmedMessage = (followUpMessage || "").trim();

    if (!trimmedMessage) {
      showToast(
        "error",
        "Follow-Up Required",
        "Please enter a follow-up message before sending."
      );

      return;
    }

    if (followUpSubmitting) {
      return;
    }

    const documentKey = followUpTargetDocument;

    if (!documentKey) {
      showToast(
        "error",
        "No Document Selected",
        "Please choose a document before sending a follow-up."
      );

      return;
    }

    setFollowUpError("");
    setFollowUpSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        showToast(
          "error",
          "Authentication Required",
          "Please log in to send a follow-up request."
        );

        return;
      }

      const formData = new FormData();
      formData.append("document_key", documentKey);
      formData.append("message", trimmedMessage);
      if (followUpAttachment) {
        formData.append("attachment", followUpAttachment);
      }

      await axios.post(
        `http://localhost:8000/api/applications/${activeApplicationId}/documents/follow-ups`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      await fetchDocumentOverview({ silent: true });

      showToast(
        "success",
        "Follow-Up Sent",
        "Your follow-up message has been sent to HR."
      );

      handleCloseFollowUpModal();
    } catch (error) {
      console.error("Error sending follow-up request:", error);

      showToast(
        "error",
        "Follow-Up Failed",
        error.response?.data?.message ||
        "Unable to send follow-up request. Please try again later."
      );
    } finally {
      setFollowUpSubmitting(false);
    }
  };

  const handleOpenFollowUpModal = (documentKey) => {
    setFollowUpTargetDocument(documentKey);
    setFollowUpMessage("");
    setFollowUpAttachment(null);
    setFollowUpError("");
    setShowFollowUpModal(true);
  };

  const handleCloseFollowUpModal = () => {
    setShowFollowUpModal(false);
    setFollowUpTargetDocument(null);
    setFollowUpMessage("");
    setFollowUpAttachment(null);
    setFollowUpError("");
    setFollowUpSubmitting(false);
  };

  const handleFollowUpAttachmentChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (file && file.size > 5 * 1024 * 1024) {
      setFollowUpError("Attachment must be 5MB or less.");
      event.target.value = "";
      return;
    }

    setFollowUpError("");
    setFollowUpAttachment(file);
  };

  const handleRemoveFollowUpAttachment = () => {
    setFollowUpAttachment(null);
    setFollowUpError("");
  };

  const fetchDocumentOverview = useCallback(async (options = {}) => {
    const { silent = false } = options || {};

    if (!activeApplicationId) {
      return null;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setDocumentError("Please log in to manage your onboarding documents.");

      return null;
    }

    try {
      if (!silent) {
      setDocumentLoading(true);
      }

      const response = await axios.get(
        `http://localhost:8000/api/applications/${activeApplicationId}/documents/overview`,

        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const overviewData = response.data?.data ?? null;

      return applyDocumentOverview(overviewData);
    } catch (error) {
      console.error("Error fetching document overview:", error);

      const message =
        error.response?.data?.message ||
        "Failed to load document requirements. Please try again.";

      setDocumentError(message);

      return null;
    } finally {
      if (!silent) {
      setDocumentLoading(false);
      }
    }
  }, [activeApplicationId, applyDocumentOverview]);

  const handleSubmitDocument = async (documentKey) => {
    let success = false;
    const selectedFile = documentUploads[documentKey];

    if (!selectedFile) {
      showToast(
        "error",
        "No File Selected",
        `Please select a file for ${getDocumentLabel(
          documentKey
        )} before submitting.`
      );

      return false;
    }

    if (!activeApplicationId) {
      showToast(
        "error",
        "No Application Found",
        "We could not determine your application. Please refresh and try again."
      );

      return false;
    }

    let requirementId = requirementIdsByDocumentKey[documentKey];

    if (!requirementId) {
      const resolvedRequirement = await resolveRequirementViaApi(documentKey);

      if (resolvedRequirement?.id) {
        requirementId = resolvedRequirement.id;
      } else {
        return false;
      }
    }

    const identifierConfig = GOVERNMENT_ID_FIELD_MAP[documentKey] || null;
    let identifierValue = null;

    if (identifierConfig) {
      const currentValue = governmentIdNumbers[documentKey] || "";
      const trimmedValue = currentValue.trim();

      if (!trimmedValue) {
        showToast(
          "error",
          "Missing Information",
          `Please enter your ${identifierConfig.label} before submitting.`
        );

        return false;
      }

      if (trimmedValue !== currentValue) {
        setGovernmentIdNumbers((prev) => ({
          ...prev,
          [documentKey]: trimmedValue,
        }));
      }

      identifierValue = trimmedValue;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      showToast(
        "error",
        "Authentication Required",
        "Please log in again to continue."
      );

      return false;
    }

    const formData = new FormData();

    formData.append("file", selectedFile);

    if (identifierConfig && identifierValue !== null) {
      formData.append(identifierConfig.field, identifierValue);
    }

    try {
      setUploadingDocumentKey(documentKey);

      const uploadUrl = `http://localhost:8000/api/applications/${activeApplicationId}/documents/requirements/${requirementId}/upload`;

      const response = await axios.post(uploadUrl, formData, {
        headers: {
          Authorization: `Bearer ${token}`,

          "Content-Type": "multipart/form-data",
        },
      });

      setUploadErrors((prev) => {
        const next = { ...prev };

        delete next[documentKey];

        return next;
      });

      setDocumentUploads((prev) => {
        const next = { ...prev };

        delete next[documentKey];

        return next;
      });

      setDocumentPreviews((prev) => {
        const next = { ...prev };

        if (next[documentKey]) {
          URL.revokeObjectURL(next[documentKey]);

          delete next[documentKey];
        }

        return next;
      });

      delete documentPreviewsRef.current[documentKey];

      if (response.data?.overview) {
        applyDocumentOverview(response.data.overview);
      } else {
        await fetchDocumentOverview();
      }

      showToast(
        "success",
        "Submission Successful",
        `${getDocumentLabel(documentKey)} successfully sent to HR.`
      );

      success = true;
    } catch (error) {
      console.error("Error submitting document:", error);

      const errorMessage = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(" ")
        : error.response?.data?.message ||
          "We were unable to submit this document. Please try again.";

      setUploadErrors((prev) => ({
        ...prev,

        [documentKey]: errorMessage,
      }));

      showToast("error", "Submission Failed", errorMessage);
    } finally {
      setUploadingDocumentKey(null);
    }

    return success;
  };

  useEffect(() => {
    documentPreviewsRef.current = documentPreviews;
  }, [documentPreviews]);

  useEffect(() => {
    if (!activeApplicationId) return;

    fetchDocumentOverview();
  }, [activeApplicationId, fetchDocumentOverview]);

  useEffect(() => {
    if (
      currentPage !== "onboarding" ||
      activeTab !== "documents" ||
      !activeApplicationId
    ) {
      return;
    }

    fetchDocumentOverview();

    const interval = setInterval(
      () => fetchDocumentOverview({ silent: true }),
      10 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, [currentPage, activeTab, activeApplicationId, fetchDocumentOverview]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const resolvedName = resolveApplicantDisplayName(
        storedUser,
        userApplications
      );

      if (resolvedName) {
        setApplicantName(resolvedName);
      }

      const fallbackName =
        resolvedName ||
        storedUser?.full_name ||
        storedUser?.name ||
        `${storedUser?.first_name ?? ""} ${storedUser?.last_name ?? ""}`.trim();

      const avatarUrl =
        resolveAvatarUrl(storedUser) ||
        generateAvatarFallback(fallbackName || "Applicant");

      setApplicantAvatarUrl(avatarUrl);
    } catch (error) {
      console.error("Error resolving applicant name from storage:", error);
    }
  }, [
    generateAvatarFallback,
    resolveApplicantDisplayName,
    resolveAvatarUrl,
    userApplications,
  ]);

  useEffect(() => {
    const syncApplicantProfile = async () => {
      if (typeof window === "undefined") return;

      const token = localStorage.getItem("token");

      if (!token) return;

      try {
        const response = await axios.get(
          "http://localhost:8000/api/auth/user",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response?.data) {
          const fetchedUser = response.data;

          const normalizedFullName =
            normalizeNameValue(fetchedUser.full_name) ||
            normalizeNameValue(
              `${fetchedUser.first_name ?? ""} ${fetchedUser.last_name ?? ""}`
            ) ||
            `${(fetchedUser.first_name ?? "").trim()} ${(
              fetchedUser.last_name ?? ""
            ).trim()}`.trim();

          const canonicalUser = {
            ...fetchedUser,

            first_name: (fetchedUser.first_name ?? "").trim(),

            last_name: (fetchedUser.last_name ?? "").trim(),

            full_name: normalizedFullName,

            name: normalizeNameValue(fetchedUser.name) || normalizedFullName,
          };

          localStorage.setItem("user", JSON.stringify(canonicalUser));

          const resolvedName = resolveApplicantDisplayName(canonicalUser);

          if (resolvedName) {
            setApplicantName(resolvedName);
          }

          const fallbackName =
            resolvedName ||
            normalizedFullName ||
            canonicalUser.name ||
            canonicalUser.full_name ||
            "Applicant";

          const avatarUrl =
            resolveAvatarUrl(canonicalUser) ||
            generateAvatarFallback(fallbackName);

          setApplicantAvatarUrl(avatarUrl);
        }
      } catch (error) {
        console.error("Error syncing authenticated user profile:", error);
      }
    };

    syncApplicantProfile();
  }, [
    generateAvatarFallback,
    normalizeNameValue,
    resolveApplicantDisplayName,
    resolveAvatarUrl,
  ]);

  useEffect(() => {
    let isMounted = true;

    const requestBrowserCoordinates = () =>
      new Promise((resolve) => {
        if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
          resolve(null);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          () => resolve(null),
          {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 5 * 60 * 1000,
          }
        );
      });

    const parseCoordinate = (value) => {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
      }

      if (typeof value === "string") {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
      }

      return null;
    };

    const normalizeTemperatureToCelsius = (temperaturePayload) => {
      const parseCandidate = (value) => {
        if (typeof value === "number") {
          return Number.isFinite(value) ? value : null;
        }

        if (typeof value === "string") {
          const parsed = Number.parseFloat(value);
          return Number.isFinite(parsed) ? parsed : null;
        }

        return null;
      };

      if (
        typeof temperaturePayload === "number" ||
        typeof temperaturePayload === "string"
      ) {
        return parseCandidate(temperaturePayload);
      }

      if (temperaturePayload == null || typeof temperaturePayload !== "object") {
        return null;
      }

      const directCandidates = [
        temperaturePayload.value,
        temperaturePayload.degrees,
        temperaturePayload.degreesCelsius,
        temperaturePayload.celsius,
        temperaturePayload.valueCelsius,
        temperaturePayload.metricValue,
        temperaturePayload.metricDegrees,
        temperaturePayload.metric?.value,
        temperaturePayload.metric?.degrees,
        temperaturePayload.metric?.celsius,
        temperaturePayload.metric?.amount,
      ];

      for (const candidate of directCandidates) {
        const parsed = parseCandidate(candidate);
        if (parsed !== null) {
          return parsed;
        }
      }

      const fahrenheitCandidates = [
        temperaturePayload.degreesFahrenheit,
        temperaturePayload.valueFahrenheit,
        temperaturePayload.fahrenheit,
        temperaturePayload.imperial?.value,
      ];

      for (const candidate of fahrenheitCandidates) {
        const parsed = parseCandidate(candidate);
        if (parsed !== null) {
          return ((parsed - 32) * 5) / 9;
        }
      }

      if (typeof temperaturePayload.value === "number") {
        const unitCode = (
          temperaturePayload.unitCode ||
          temperaturePayload.unit ||
          temperaturePayload.units ||
          ""
        )
          .toString()
          .toUpperCase();

        if (unitCode.includes("FAHRENHEIT")) {
          return ((temperaturePayload.value - 32) * 5) / 9;
        }

        if (unitCode.includes("CELSIUS") || unitCode.includes("CEL")) {
          return temperaturePayload.value;
        }
      }

      return null;
    };

    const fetchWeatherFromGoogle = async (
      latitude,
      longitude,
      ipLocationLabel
    ) => {
      const weatherResponse = await axios.get(
        "https://weather.googleapis.com/v1/currentConditions:lookup",
        {
          params: {
            key: GOOGLE_WEATHER_API_KEY,
            "location.latitude": latitude,
            "location.longitude": longitude,
            unitSystem: "METRIC",
          },
        }
      );

      const weatherData = weatherResponse?.data || {};

      const currentConditionsArray = Array.isArray(
        weatherData?.currentConditions
      )
        ? weatherData.currentConditions
        : weatherData?.currentConditions
        ? [weatherData.currentConditions]
        : [];

      const currentConditions = currentConditionsArray[0];

      if (!currentConditions) {
        throw new Error("Current conditions not available.");
      }

      const temperatureCelsius = normalizeTemperatureToCelsius(
        currentConditions.temperature
      );

      const apiConditionText =
        (Array.isArray(currentConditions.weatherConditions)
          ? currentConditions.weatherConditions
              .map((condition) => {
                if (typeof condition === "string") {
                  return condition;
                }

                return (
                  condition?.text ||
                  condition?.localizedText ||
                  condition?.shortText ||
                  condition?.description ||
                  null
                );
              })
              .find(
                (text) => typeof text === "string" && text.trim().length > 0
              )
          : null) ||
        currentConditions.weatherCondition?.description?.text ||
        currentConditions.weatherCondition?.text ||
        currentConditions.summary ||
        currentConditions.conditionCode ||
        "";

      const conditionLabel = (
        getWeatherDescription(
          currentConditions.conditionCode ??
            currentConditions.weatherCondition?.code ??
            currentConditions.weatherCode,
          apiConditionText
        ) || apiConditionText || ""
      ).trim();

      const googlePlace =
        weatherData?.place ||
        weatherData?.location ||
        currentConditions?.place ||
        null;

      const googlePlaceName =
        googlePlace?.displayName?.text ||
        googlePlace?.displayName ||
        googlePlace?.name ||
        googlePlace?.formattedAddress ||
        googlePlace?.address ||
        "";

      const resolvedLocation =
        (googlePlaceName && googlePlaceName.length > 0
          ? googlePlaceName
          : ipLocationLabel) || "your area";

      return {
        temperature: temperatureCelsius,
        condition: conditionLabel,
        location: resolvedLocation,
        observedAt:
          currentConditions.observationTime?.value ||
          currentConditions.observationTime ||
          null,
        source: "google",
      };
    };

    const fetchWeatherFromOpenMeteo = async (
      latitude,
      longitude,
      ipLocationLabel
    ) => {
      const response = await axios.get(
        "https://api.open-meteo.com/v1/forecast",
        {
          params: {
            latitude,
            longitude,
            current_weather: true,
            timezone: "auto",
          },
        }
      );

      const currentWeather = response?.data?.current_weather;

      if (!currentWeather) {
        throw new Error("Open-Meteo current weather unavailable.");
      }

      const conditionLabel = (
        getWeatherDescription(
          currentWeather.weathercode,
          currentWeather.weathercode_description ||
            currentWeather.weather_description ||
            ""
        ) || ""
      ).trim();

      return {
        temperature: Number.isFinite(currentWeather.temperature)
          ? currentWeather.temperature
          : null,
        condition: conditionLabel,
        location: ipLocationLabel || "your area",
        observedAt: currentWeather.time || null,
        source: "open-meteo",
      };
    };

    const fetchWeatherAndLocation = async () => {
      setWeatherInfo((prev) => ({
        ...prev,
        loading: true,
      }));
      setWeatherError(null);

      try {
        const [browserCoordinates, ipLocationData] = await Promise.all([
          requestBrowserCoordinates(),
          axios
            .get("https://ipapi.co/json/")
            .then((response) => response.data)
            .catch((locationError) => {
              console.error(
                "IP-based location lookup failed:",
                locationError
              );
              return null;
            }),
        ]);

        const ipLatitude = parseCoordinate(ipLocationData?.latitude);
        const ipLongitude = parseCoordinate(ipLocationData?.longitude);

        const latitude =
          parseCoordinate(browserCoordinates?.latitude) ?? ipLatitude;

        const longitude =
          parseCoordinate(browserCoordinates?.longitude) ?? ipLongitude;

        if (typeof latitude !== "number" || typeof longitude !== "number") {
          throw new Error("Unable to determine user coordinates.");
        }

        const ipLocationLabel = ipLocationData
          ? [
              ipLocationData.city,
              ipLocationData.region,
              ipLocationData.country_name || ipLocationData.country,
            ]
              .filter((segment) => segment && segment.length > 0)
              .join(", ")
          : "";

        let weatherResult = null;

        if (GOOGLE_WEATHER_API_KEY) {
          try {
            weatherResult = await fetchWeatherFromGoogle(
              latitude,
              longitude,
              ipLocationLabel
            );
          } catch (googleError) {
            console.error("Google Weather API failed:", googleError);
          }
        }

        if (!weatherResult) {
          try {
            weatherResult = await fetchWeatherFromOpenMeteo(
              latitude,
              longitude,
              ipLocationLabel
            );
          } catch (fallbackError) {
            console.error("Fallback weather provider failed:", fallbackError);
          }
        }

        if (!weatherResult) {
          throw new Error("No weather data available.");
        }

        if (!isMounted) {
          return;
        }

        setWeatherInfo({
          loading: false,
          temperature:
            typeof weatherResult.temperature === "number" &&
            Number.isFinite(weatherResult.temperature)
              ? weatherResult.temperature
              : null,
          condition: weatherResult.condition || "",
          location: weatherResult.location || "",
          observedAt: weatherResult.observedAt || null,
          source: weatherResult.source || null,
        });

        setWeatherError(null);
      } catch (error) {
        console.error("Failed to fetch weather information:", error);

        if (!isMounted) {
          return;
        }

        setWeatherInfo({
          loading: false,
          temperature: null,
          condition: "",
          location: "",
          observedAt: null,
          source: null,
        });

        setWeatherError(error?.message || "Weather unavailable");
      }
    };

    fetchWeatherAndLocation();

    return () => {
      isMounted = false;
    };
  }, [getWeatherDescription]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(
        DOCUMENT_STATUS_STORAGE_KEY,
        JSON.stringify(documentStatuses)
      );
    } catch (error) {
      console.error("Error saving document statuses:", error);
    }
  }, [documentStatuses]);

  useEffect(() => {
    return () => {
      Object.values(documentPreviewsRef.current).forEach((url) => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const handleBellIconClick = () => {
    setShowNotificationDropdown(!showNotificationDropdown);

    if (!showNotificationDropdown) {
      fetchNotifications();
    }
  };

  const handleViewApplication = () => {
    // Refresh user data from localStorage to get latest info

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    console.log("Refreshing user data for View Application:", user);

    fetchUserApplications(); // Refresh applications data

    setShowApplicationModal(true);
  };

  // Get current Philippines time

  const getCurrentPhilippinesTime = () => {
    return new Date().toLocaleString("en-PH", {
      timeZone: "Asia/Manila",

      year: "numeric",

      month: "long",

      day: "numeric",

      hour: "2-digit",

      minute: "2-digit",

      second: "2-digit",
    });
  };

  // Fetch user's applications

  const fetchUserApplications = async () => {
    try {
      setLoadingApplications(true);

      // Check for latest application from localStorage first (from JobPortal.js)

      const latestApplication = JSON.parse(
        localStorage.getItem("latestApplication") || "null"
      );

      if (
        latestApplication &&
        latestApplication.job_title &&
        latestApplication.department &&
        latestApplication.position &&
        latestApplication.applied_at
      ) {
        console.log(
          "Found latest application from localStorage:",
          latestApplication
        );

        const result = [latestApplication];

        setUserApplications(result);

        setLoadingApplications(false);

        return result;
      } else if (latestApplication) {
        // Clear invalid application data from localStorage

        console.log("Clearing invalid application data from localStorage");

        localStorage.removeItem("latestApplication");
      }

      // If no latest application, fetch from API

      const token = localStorage.getItem("token");

      const response = await axios.get(
        "http://localhost:8000/api/my-applications",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Get user info from localStorage (from RegisterApplicant.js)

      const storedUserRaw = localStorage.getItem("user") || "{}";

      const user = JSON.parse(storedUserRaw);

      console.log("User data from localStorage:", user);

      const constructedFullName = resolveApplicantDisplayName(user) || "";

      console.log("Full name constructed:", constructedFullName || "[none]");

      const userEmail = normalizeEmailValue(user.email);

      console.log("User email:", userEmail || "[none]");

      let finalName = constructedFullName;

      let finalEmail = userEmail;

      if (!finalName && response.data.length > 0) {
        const firstApp = response.data[0];

        if (firstApp.applicant_name) {
          finalName = normalizeNameValue(firstApp.applicant_name) || finalName;
        }

        if (firstApp.applicant_email) {
          finalEmail =
            normalizeEmailValue(firstApp.applicant_email) || finalEmail;
        }

        if (
          !finalEmail &&
          firstApp.applicant &&
          typeof firstApp.applicant.email === "string"
        ) {
          finalEmail =
            normalizeEmailValue(firstApp.applicant.email) || finalEmail;
        }
      }

      const safeApplicantName = normalizeNameValue(finalName) || "Applicant";

      const safeApplicantEmail =
        normalizeEmailValue(finalEmail) ||
        normalizeEmailValue(user.email) ||
        "N/A";

      try {
        const existingFirst =
          typeof user.first_name === "string" ? user.first_name : "";

        const existingLast =
          typeof user.last_name === "string" ? user.last_name : "";

        const updatedUserPayload = {
          ...user,

          first_name: existingFirst,

          last_name: existingLast,

          name: safeApplicantName,

          full_name: safeApplicantName,
        };

        localStorage.setItem("user", JSON.stringify(updatedUserPayload));
      } catch (storageError) {
        console.error("Error updating stored user profile:", storageError);
      }

      // Filter out invalid applications and enhance application data with user info and proper timezone

      const validApplications = response.data.filter(
        (app) =>
          app.job_posting &&
          app.job_posting.title &&
          app.job_posting.department &&
          app.job_posting.position &&
          app.applied_at &&
          app.status
      );

      const enhancedApplications = validApplications.map((app) => ({
        ...app,

        applicant_name: safeApplicantName,

        applicant_email: safeApplicantEmail,

        job_title: app.job_posting?.title,

        department: app.job_posting?.department,

        position: app.job_posting?.position,

        applied_at_ph: app.applied_at
          ? new Date(app.applied_at).toLocaleString("en-PH", {
              timeZone: "Asia/Manila",

              year: "numeric",

              month: "long",

              day: "numeric",

              hour: "2-digit",

              minute: "2-digit",

              second: "2-digit",
            })
          : "N/A",

        applied_date_ph: app.applied_at
          ? new Date(app.applied_at).toLocaleDateString("en-PH", {
              timeZone: "Asia/Manila",

              year: "numeric",

              month: "long",

              day: "numeric",
            })
          : "N/A",

        applied_time_ph: app.applied_at
          ? new Date(app.applied_at).toLocaleTimeString("en-PH", {
              timeZone: "Asia/Manila",

              hour: "2-digit",

              minute: "2-digit",

              second: "2-digit",
            })
          : "N/A",
      }));

      console.log("Enhanced applications:", enhancedApplications);

      if (safeApplicantName) {
        setApplicantName(safeApplicantName);
      }

      setUserApplications(enhancedApplications);

      return enhancedApplications;
    } catch (error) {
      console.error("Error fetching applications:", error);

      setUserApplications([]);

      return [];
    } finally {
      setLoadingApplications(false);
    }
  };

  // Fetch interview data for the current user

  const fetchInterviewData = async () => {
    try {
      console.log("🔄 [PersonalOnboarding] Starting interview data fetch...");

      setLoadingInterview(true);

      const token = localStorage.getItem("token");

      if (!token) {
        console.log(
          "❌ [PersonalOnboarding] No token found for interview data fetch"
        );

        setInterviewData([]);

        return;
      }

      // Get authenticated user from API (ensures we use the correct user_id from authenticated session)

      let authenticatedUserId = null;

      try {
        const userResponse = await axios.get(
          "http://localhost:8000/api/auth/user",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (userResponse.data && userResponse.data.id) {
          authenticatedUserId = userResponse.data.id;

          console.log(
            "👤 [PersonalOnboarding] Authenticated user ID from API:",
            authenticatedUserId
          );
        }
      } catch (error) {
        console.log(
          "⚠️ [PersonalOnboarding] Failed to get authenticated user from API, trying localStorage:",
          error.message
        );

        // Fallback to localStorage

        const user = JSON.parse(localStorage.getItem("user") || "{}");

        authenticatedUserId = user.id;
      }

      if (!authenticatedUserId) {
        console.log(
          "❌ [PersonalOnboarding] No user ID available for fetching interviews"
        );

        setInterviewData([]);

        return;
      }

      // Fetch interviews using the authenticated user's ID

      // The backend will ensure the user can only see their own interviews

      try {
        console.log(
          `🌐 [PersonalOnboarding] Fetching interviews for authenticated user ID: ${authenticatedUserId}`
        );

        const response = await axios.get(
          `http://localhost:8000/api/interviews/user/${authenticatedUserId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const allInterviews = response.data || [];

        console.log(
          "📥 [PersonalOnboarding] Received interview data:",
          allInterviews
        );

        if (allInterviews.length > 0) {
          console.log(
            "✅ [PersonalOnboarding] Found interviews:",
            allInterviews.length
          );

          const normalizedInterviews =
            enrichInterviewsWithLocalEndTime(allInterviews);

          setInterviewData(normalizedInterviews);
        } else {
          console.log(
            "ℹ️ [PersonalOnboarding] No interviews found for this user"
          );

          setInterviewData([]);
        }
      } catch (error) {
        console.error(
          "❌ [PersonalOnboarding] Error fetching interview data:",
          error
        );

        if (error?.response?.status === 401) {
          console.log(
            "⚠️ [PersonalOnboarding] Authentication expired, please log in again"
          );
        } else if (error?.response?.status === 403) {
          console.log("⚠️ [PersonalOnboarding] Access forbidden");
        }

        setInterviewData([]);
      }
    } catch (error) {
      console.error(
        "❌ [PersonalOnboarding] Error fetching interview data:",
        error
      );

      setInterviewData([]);
    } finally {
      setLoadingInterview(false);
    }
  };

  // Enrich backend interviews with HR-entered time fields saved locally (interview_time and end_time)

  const enrichInterviewsWithLocalEndTime = (backendInterviews) => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("scheduledInterviews") || "[]"
      );

      if (!Array.isArray(backendInterviews) || stored.length === 0)
        return backendInterviews;

      return backendInterviews.map((iv) => {
        const appId = iv.application_id || iv.application?.id;

        const match = stored.find(
          (si) =>
            (si.applicationId && appId && si.applicationId === appId) ||
            (si.applicantEmail &&
              iv.application?.applicant?.email &&
              si.applicantEmail === iv.application?.applicant?.email)
        );

        if (!match) return iv;

        const enriched = { ...iv };

        // Copy HR-entered end time

        if (match.endTime) {
          enriched.end_time = match.endTime;

          enriched.endTime = match.endTime;
        }

        // Copy HR-entered interview time (mirror endTime behavior)

        if (match.interviewTime) {
          enriched.interview_time = match.interviewTime;

          enriched.interviewTime = match.interviewTime;
        }

        if (!enriched.stage && match.stage) {
          enriched.stage = match.stage;
        }

        return enriched;
      });
    } catch (e) {
      console.log(
        "⚠️ [PersonalOnboarding] Failed to enrich interviews with local end time:",
        e.message
      );

      return backendInterviews;
    }
  };

  // Helpers: safe formatters that show HR-entered values if parsing fails

  const formatInterviewDateSafe = (dateStr) => {
    if (!dateStr) return "Not specified";

    const d = new Date(dateStr);

    if (isNaN(d.getTime())) return String(dateStr);

    try {
      return d.toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",

        weekday: "long",

        year: "numeric",

        month: "long",

        day: "numeric",
      });
    } catch (_) {
      return String(dateStr);
    }
  };

  const formatInterviewTimeSafe = (timeStr) => {
    if (!timeStr) return "Not specified";

    const raw = String(timeStr).trim();

    // If already 12-hour format with AM/PM, show as-is

    if (/\b(am|pm)\b/i.test(raw)) return raw.toUpperCase();

    // If it's a full ISO datetime, parse directly

    if (/^\d{4}-\d{2}-\d{2}t/i.test(raw)) {
      const iso = new Date(raw);

      if (!isNaN(iso.getTime())) {
        try {
          return iso.toLocaleTimeString("en-PH", {
            timeZone: "Asia/Manila",

            hour: "2-digit",

            minute: "2-digit",

            hour12: true,
          });
        } catch (_) {
          return raw;
        }
      }
    }

    // Try to format via Date if HH:MM[:SS]

    const d = new Date(`2000-01-01T${raw}`);

    if (!isNaN(d.getTime())) {
      try {
        return d.toLocaleTimeString("en-PH", {
          timeZone: "Asia/Manila",

          hour: "2-digit",

          minute: "2-digit",

          hour12: true,
        });
      } catch (_) {
        return raw;
      }
    }

    return raw;
  };

const formatStageLabel = (stage) => {
  if (!stage) return "Interview";

  return stage
    .toString()
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

  // Local interview merge removed: only backend-sourced interview data is used

  // Notification handlers

  const handleNotificationClick = async (notificationId) => {
    // Find the notification to determine its type

    const notification = notifications.find((n) => n.id === notificationId);

    if (!notification) return;

    const token = localStorage.getItem("token");

    // Perform associated actions when notification is clicked

    await performAssociatedActions(notification, token);

    // Mark notification as read via backend API

    await handleMarkRead(notificationId);

    // Mark notification as read in local state

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, read: true, selected: true }
          : { ...n, selected: false }
      )
    );

    // Navigate to related tab based on backend notification type

    let targetTab = "status"; // default

    // Use notification type from backend to determine routing

    switch (notification.type) {
      case "job_application_submitted":
        targetTab = "status";

        break;

      case "job_application_status_changed":
        // Navigate based on the status in the notification

        targetTab = "status";

        // If offer-related status, go to offer tab

        if (notification.message?.toLowerCase().includes("offer")) {
          targetTab = "offer";
        }

        // If interview-related, go to interview tab and refresh data
        else if (notification.message?.toLowerCase().includes("interview")) {
          targetTab = "interview";

          // Removed auto loading - will only load when tab is clicked

          // fetchInterviewData();
        }

        break;

      case "interview_scheduled":

      case "meeting_invitation":
        targetTab = "interview";

        // Fetch fresh interview data when navigating to interview tab from notification

        fetchInterviewData();

        break;

      case "job_offer_received":

      case "offer_sent":
        targetTab = "offer";

        break;

      case "orientation_scheduled":

      case "onboarding_update":
        targetTab = "onboarding";

        break;

      case "leave_status":

      case "cash_advance_status":

      case "evaluation_result":
        // These are for employees, default to status

        targetTab = "status";

        break;

      default:
        // Check message content for hints

        const message = notification.message?.toLowerCase() || "";

        if (message.includes("onboarding") || message.includes("orientation")) {
          targetTab = "onboarding";
        } else if (message.includes("interview")) {
          targetTab = "interview";
        } else if (message.includes("offer")) {
          targetTab = "offer";
        } else {
          targetTab = "status";
        }
    }

    // Navigate to the target tab (within the same page, no new tab)

    setCurrentPage(targetTab);

    // Show toast confirmation

    const tabNames = {
      status: "Application Status",

      interview: "Interview Details",

      offer: "Job Offer",

      onboarding: "Onboarding",
    };

    showToast(
      "info",
      "Navigating",
      `Taking you to ${tabNames[targetTab] || "your details"}...`
    );

    // Scroll to top for better UX

    window.scrollTo({ top: 0, behavior: "smooth" });

    // Also scroll the main content area

    const mainContent = document.querySelector(".main-content");

    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getUnreadCount = () => {
    return notifications.filter((notification) => !notification.read).length;
  };

  // Bulk operation handlers

  const handleSelectAll = () => {
    const allSelected = notifications.every(
      (notification) => notification.selected
    );

    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, selected: !allSelected }))
    );
  };

  const handleReadAll = async () => {
    try {
      const token = localStorage.getItem("token");

      const unreadNotifications = notifications.filter(
        (notification) => !notification.read
      );

      // Mark all unread notifications as read in backend

      const markReadPromises = unreadNotifications.map((notification) =>
        axios.post(
          `http://localhost:8000/api/notifications/${notification.id}/read`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
      );

      await Promise.all(markReadPromises);

      // Update local state

      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );

      showToast(
        "success",
        "Notifications Updated",
        "All notifications have been marked as read."
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);

      showToast(
        "error",
        "Error",
        "Failed to mark all notifications as read. Please try again."
      );
    }
  };

  const handleDeleteSelected = async () => {
    try {
      const token = localStorage.getItem("token");

      const selectedNotifications = notifications.filter(
        (notification) => notification.selected
      );

      // Perform associated actions for each selected notification

      const associatedActionPromises = selectedNotifications.map(
        (notification) => performAssociatedActions(notification, token)
      );

      await Promise.all(associatedActionPromises);

      // Delete selected notifications from backend

      const deletePromises = selectedNotifications.map((notification) =>
        axios.delete(
          `http://localhost:8000/api/notifications/${notification.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
      );

      await Promise.all(deletePromises);

      // Update local state

      setNotifications((prev) =>
        prev.filter((notification) => !notification.selected)
      );

      showToast(
        "success",
        "Notifications Deleted",
        `${selectedNotifications.length} notification(s) and associated actions have been completed.`
      );
    } catch (error) {
      console.error("Error deleting selected notifications:", error);

      showToast(
        "error",
        "Error",
        "Failed to delete selected notifications. Please try again."
      );
    }
  };

  const handleDeleteAll = async () => {
    try {
      const token = localStorage.getItem("token");

      // Perform associated actions for all notifications

      const associatedActionPromises = notifications.map((notification) =>
        performAssociatedActions(notification, token)
      );

      await Promise.all(associatedActionPromises);

      // Delete all notifications from backend

      const deletePromises = notifications.map((notification) =>
        axios.delete(
          `http://localhost:8000/api/notifications/${notification.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
      );

      await Promise.all(deletePromises);

      // Update local state

      setNotifications([]);

      showToast(
        "success",
        "All Notifications Deleted",
        "All notifications and associated actions have been completed."
      );
    } catch (error) {
      console.error("Error deleting all notifications:", error);

      showToast(
        "error",
        "Error",
        "Failed to delete all notifications. Please try again."
      );
    }
  };

  const handleMarkRead = async (notificationId) => {
    try {
      const token = localStorage.getItem("token");

      await axios.post(
        `http://localhost:8000/api/notifications/${notificationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );

      showToast(
        "success",
        "Notification Read",
        "Notification has been marked as read."
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);

      showToast(
        "error",
        "Error",
        "Failed to mark notification as read. Please try again."
      );
    }
  };

  // Perform associated actions when deleting notifications

  const performAssociatedActions = async (notification, token) => {
    try {
      switch (notification.type) {
        case "job_application_submitted":
          // Mark application as reviewed when notification is deleted

          if (notification.application_id) {
            await axios.put(
              `http://localhost:8000/api/applications/${notification.application_id}/reviewed`,
              {},
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            console.log(
              "✅ [PersonalOnboarding] Application marked as reviewed:",
              notification.application_id
            );
          }

          break;

        case "job_application_status_changed":
          // Mark status change as acknowledged

          if (notification.application_id) {
            await axios.put(
              `http://localhost:8000/api/applications/${notification.application_id}/status-acknowledged`,
              {},
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            console.log(
              "✅ [PersonalOnboarding] Status change acknowledged:",
              notification.application_id
            );
          }

          break;

        case "interview_scheduled":

        case "meeting_invitation":
          // Mark interview/meeting as acknowledged

          if (notification.application_id) {
            await axios.put(
              `http://localhost:8000/api/applications/${notification.application_id}/interview-acknowledged`,
              {},
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            console.log(
              "✅ [PersonalOnboarding] Interview/meeting acknowledged:",
              notification.application_id
            );
          }

          break;

        case "job_offer_received":

        case "offer_sent":
          // Mark offer as acknowledged

          if (notification.application_id) {
            await axios.put(
              `http://localhost:8000/api/applications/${notification.application_id}/offer-acknowledged`,
              {},
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            console.log(
              "✅ [PersonalOnboarding] Job offer acknowledged:",
              notification.application_id
            );
          }

          break;

        case "orientation_scheduled":

        case "onboarding_started":

        case "onboarding_update":
          // Mark onboarding notification as acknowledged

          if (notification.application_id) {
            await axios.put(
              `http://localhost:8000/api/onboarding-records/${notification.application_id}/notification-acknowledged`,
              {},
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            console.log(
              "✅ [PersonalOnboarding] Onboarding notification acknowledged:",
              notification.application_id
            );
          }

          break;

        case "onboarding_profile_required":
          // Mark profile requirement as acknowledged

          await axios.put(
            `http://localhost:8000/api/onboarding-records/profile-requirement-acknowledged`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          console.log(
            "✅ [PersonalOnboarding] Profile requirement acknowledged"
          );

          break;

        case "onboarding_documents_required":
          // Mark document requirement as acknowledged

          await axios.put(
            `http://localhost:8000/api/onboarding-records/documents-requirement-acknowledged`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          console.log(
            "✅ [PersonalOnboarding] Documents requirement acknowledged"
          );

          break;

        case "onboarding_benefits_available":
          // Mark benefits notification as acknowledged

          await axios.put(
            `http://localhost:8000/api/onboarding-records/benefits-acknowledged`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          console.log(
            "✅ [PersonalOnboarding] Benefits notification acknowledged"
          );

          break;

        case "onboarding_starting_date_set":
          // Mark starting date notification as acknowledged

          await axios.put(
            `http://localhost:8000/api/onboarding-records/starting-date-acknowledged`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          console.log(
            "✅ [PersonalOnboarding] Starting date notification acknowledged"
          );

          break;

        default:
          // For other notification types, just log that they were processed

          console.log(
            "✅ [PersonalOnboarding] Notification processed:",
            notification.type
          );

          break;
      }
    } catch (error) {
      console.error("Error performing associated actions:", error);

      // Don't throw error here to prevent deletion failure

      // The notification will still be deleted even if associated actions fail
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      const token = localStorage.getItem("token");

      // Find the notification to get its type and associated data

      const notification = notifications.find((n) => n.id === notificationId);

      if (!notification) {
        showToast("error", "Error", "Notification not found.");

        return;
      }

      // Perform associated actions based on notification type before deletion

      await performAssociatedActions(notification, token);

      // Delete notification from backend

      await axios.delete(
        `http://localhost:8000/api/notifications/${notificationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update local state

      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId)
      );

      showToast(
        "success",
        "Notification Deleted",
        "Notification and associated actions have been completed."
      );
    } catch (error) {
      console.error("Error deleting notification:", error);

      showToast(
        "error",
        "Error",
        "Failed to delete notification. Please try again."
      );
    }
  };

  const handleToggleSelection = (notificationId) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId
          ? { ...notification, selected: !notification.selected }
          : notification
      )
    );
  };

  const getSelectedCount = () => {
    return notifications.filter((notification) => notification.selected).length;
  };

  const isAllSelected = () => {
    return (
      notifications.length > 0 &&
      notifications.every((notification) => notification.selected)
    );
  };

  const fetchOnboardingData = async () => {
    try {
      // Mock data instead of API call

      const mockData = {
        status_history: [
          { status: "Pending" },

          { status: "Interview Scheduled" },

          { status: "Offer Sent" },

          { status: "Offer Accepted" },
        ],

        offer: {
          position: "Software Developer",

          salary: "₱25,000/month",

          start_date: "2024-01-15",
        },
      };

      setOnboardingData(mockData);
    } catch (error) {
      console.error("Error fetching onboarding data:", error);

      showToast("error", "Error", "Failed to load onboarding data");
    }
  };

  // Fetch orientation data for the logged-in user

  const fetchOrientationData = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const userEmail = user.email || "";

      // Get scheduled orientations from localStorage

      const scheduledOrientations = JSON.parse(
        localStorage.getItem("scheduledOrientations") || "[]"
      );

      // Find orientation for this user

      const userOrientation = scheduledOrientations.find(
        (orientation) => orientation.applicantEmail === userEmail
      );

      if (userOrientation) {
        console.log(
          "📅 [PersonalOnboarding] Found orientation data for user:",
          userOrientation
        );

        // Check if orientation was updated (compare with previous data)

        const previousOrientation = orientationData;

        if (
          previousOrientation &&
          JSON.stringify(previousOrientation) !==
            JSON.stringify(userOrientation)
        ) {
          // Orientation was updated by HR

          showToast(
            "info",
            "Orientation Updated",
            "Your orientation schedule has been updated by HR. Please review the changes."
          );

          console.log(
            "🔔 [PersonalOnboarding] Orientation updated for user:",
            userEmail
          );
        }

        setOrientationData(userOrientation);
      } else {
        console.log(
          "📅 [PersonalOnboarding] No orientation scheduled for user:",
          userEmail
        );

        setOrientationData(null);
      }
    } catch (error) {
      console.error("Error fetching orientation data:", error);

      setOrientationData(null);
    }
  };

  // Load checklist from localStorage

  const loadChecklist = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const userEmail = user.email || "";

      const savedChecklists = JSON.parse(
        localStorage.getItem("orientationChecklists") || "{}"
      );

      if (savedChecklists[userEmail]) {
        setOrientationChecklist(savedChecklists[userEmail]);
      }
    } catch (error) {
      console.error("Error loading checklist:", error);
    }
  };

  // Handle checklist item toggle

  const handleChecklistToggle = (taskId) => {
    try {
      const updatedChecklist = orientationChecklist.map((item) =>
        item.id === taskId ? { ...item, completed: !item.completed } : item
      );

      setOrientationChecklist(updatedChecklist);

      // Save to localStorage

      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const userEmail = user.email || "";

      const savedChecklists = JSON.parse(
        localStorage.getItem("orientationChecklists") || "{}"
      );

      savedChecklists[userEmail] = updatedChecklist;

      localStorage.setItem(
        "orientationChecklists",
        JSON.stringify(savedChecklists)
      );

      console.log(
        "✅ [PersonalOnboarding] Checklist updated for user:",
        userEmail
      );
    } catch (error) {
      console.error("Error updating checklist:", error);
    }
  };

  // Calculate checklist completion percentage

  const getChecklistProgress = () => {
    const completed = orientationChecklist.filter(
      (item) => item.completed
    ).length;

    const total = orientationChecklist.length;

    return Math.round((completed / total) * 100);
  };

  // Load attendance status from localStorage

  const loadAttendanceStatus = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const userEmail = user.email || "";

      const savedAttendanceStatus = JSON.parse(
        localStorage.getItem("orientationAttendanceStatus") || "{}"
      );

      if (savedAttendanceStatus[userEmail]) {
        setAttendanceStatus(savedAttendanceStatus[userEmail]);
      }
    } catch (error) {
      console.error("Error loading attendance status:", error);
    }
  };

  // Handle attendance confirmation

  const handleConfirmAttendance = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const userEmail = user.email || "";

      // Update state

      setAttendanceStatus("confirmed");

      // Save to localStorage

      const savedAttendanceStatus = JSON.parse(
        localStorage.getItem("orientationAttendanceStatus") || "{}"
      );

      savedAttendanceStatus[userEmail] = "confirmed";

      localStorage.setItem(
        "orientationAttendanceStatus",
        JSON.stringify(savedAttendanceStatus)
      );

      // Auto-check the "Confirm Attendance" checklist item

      const updatedChecklist = orientationChecklist.map((item) =>
        item.id === 1 ? { ...item, completed: true } : item
      );

      setOrientationChecklist(updatedChecklist);

      // Save updated checklist

      const savedChecklists = JSON.parse(
        localStorage.getItem("orientationChecklists") || "{}"
      );

      savedChecklists[userEmail] = updatedChecklist;

      localStorage.setItem(
        "orientationChecklists",
        JSON.stringify(savedChecklists)
      );

      // Notify HR (store notification for HR to see)

      const hrNotification = {
        id: Date.now(),

        type: "attendance_confirmed",

        applicantEmail: userEmail,

        applicantName: user.name || `${user.first_name} ${user.last_name}`,

        message: "Applicant has confirmed attendance for orientation",

        timestamp: new Date().toISOString(),

        read: false,
      };

      const hrNotifications = JSON.parse(
        localStorage.getItem("hrNotifications") || "[]"
      );

      hrNotifications.push(hrNotification);

      localStorage.setItem("hrNotifications", JSON.stringify(hrNotifications));

      showToast(
        "success",
        "Attendance Confirmed",
        "You have successfully confirmed your attendance for the orientation!"
      );

      console.log(
        "✅ [PersonalOnboarding] Attendance confirmed for user:",
        userEmail
      );
    } catch (error) {
      console.error("Error confirming attendance:", error);

      showToast(
        "error",
        "Error",
        "Failed to confirm attendance. Please try again."
      );
    }
  };

  // Handle attendance decline

  const handleDeclineAttendance = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const userEmail = user.email || "";

      // Update state

      setAttendanceStatus("declined");

      // Save to localStorage

      const savedAttendanceStatus = JSON.parse(
        localStorage.getItem("orientationAttendanceStatus") || "{}"
      );

      savedAttendanceStatus[userEmail] = "declined";

      localStorage.setItem(
        "orientationAttendanceStatus",
        JSON.stringify(savedAttendanceStatus)
      );

      // Notify HR

      const hrNotification = {
        id: Date.now(),

        type: "attendance_declined",

        applicantEmail: userEmail,

        applicantName: user.name || `${user.first_name} ${user.last_name}`,

        message: "Applicant has declined attendance for orientation",

        timestamp: new Date().toISOString(),

        read: false,
      };

      const hrNotifications = JSON.parse(
        localStorage.getItem("hrNotifications") || "[]"
      );

      hrNotifications.push(hrNotification);

      localStorage.setItem("hrNotifications", JSON.stringify(hrNotifications));

      showToast(
        "info",
        "Attendance Declined",
        "You have declined the orientation. HR will be notified."
      );

      console.log(
        "ℹ️ [PersonalOnboarding] Attendance declined for user:",
        userEmail
      );
    } catch (error) {
      console.error("Error declining attendance:", error);

      showToast(
        "error",
        "Error",
        "Failed to decline attendance. Please try again."
      );
    }
  };

  useEffect(() => {
    // Clear any invalid application data from localStorage on component mount

    const latestApplication = JSON.parse(
      localStorage.getItem("latestApplication") || "null"
    );

    if (
      latestApplication &&
      (!latestApplication.job_title ||
        !latestApplication.department ||
        !latestApplication.position ||
        !latestApplication.applied_at)
    ) {
      console.log("Clearing invalid application data on mount");

      localStorage.removeItem("latestApplication");
    }

    fetchOnboardingData();

    fetchUserApplications();

    fetchOrientationData();

    loadChecklist();

    loadAttendanceStatus();

    fetchNotifications(); // Initial fetch of notifications

    // fetchInterviewData(); // Removed auto loading - will only load when tab is clicked

    // Set up interval to check for orientation updates

    const orientationInterval = setInterval(() => {
      fetchOrientationData();
    }, 30000); // Increased from 5s to 30s

    // Set up interval to check for new notifications

    const notificationInterval = setInterval(() => {
      fetchNotifications();
    }, 120000); // Increased from 30s to 120s (2 minutes)

    // Set up interval to check for new interviews - REMOVED AUTO LOADING

    // const interviewInterval = setInterval(() => {

    //   fetchInterviewData();

    // }, 60000); // Removed auto loading - will only load when tab is clicked

    // Handle click outside to close dropdown

    const handleClickOutside = (event) => {
      const notificationContainer = document.querySelector(
        ".notification-container"
      );

      if (
        notificationContainer &&
        !notificationContainer.contains(event.target)
      ) {
        setShowNotificationDropdown(false);
      }
    };

    if (showNotificationDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      clearInterval(orientationInterval);

      clearInterval(notificationInterval);

      // clearInterval(interviewInterval); // Removed since interval is disabled

      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotificationDropdown]);

  // Fetch interview data when userApplications change - REMOVED AUTO LOADING

  // useEffect(() => {

  //   if (userApplications.length > 0) {

  //     fetchInterviewData();

  //   }

  // }, [userApplications]);

  // Fetch job offer data from backend API

  useEffect(() => {
    const fetchJobOfferData = async () => {
      try {
        // First try to fetch from localStorage as fallback

        const offers = JSON.parse(localStorage.getItem("jobOffers") || "[]");

        if (offers.length > 0) {
          const latestOffer = offers[offers.length - 1];

          setJobOfferData(latestOffer);
        }

        // Then try to fetch from backend if we have an application with offer status

        if (
          userApplications.length > 0 &&
          (userApplications[0].status === "Offered" ||
            userApplications[0].status === "Offer Accepted")
        ) {
          const token = localStorage.getItem("token");

          const response = await axios.get(
            `http://localhost:8000/api/applications/${userApplications[0].id}/job-offer`,

            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (response.data.offer) {
            console.log(
              "✅ [PersonalOnboarding] Job offer fetched from API:",
              response.data.offer
            );

            setJobOfferData(response.data.offer);
          }
        }
      } catch (error) {
        console.error("Error fetching job offer data:", error);

        // Fallback to localStorage data if API fails
      }
    };

    fetchJobOfferData();
  }, [userApplications]);

  const uploadedDocumentsCount = Object.keys(documentUploads).length;

  const pendingRequiredDocuments = requiredDocumentKeys.filter(
    (key) => !documentUploads[key]
  ).length;

  const submissionWindow = documentOverviewMeta.submissionWindow;
  const submissionHasStarted = submissionWindow?.has_started ?? false;
  const submissionDaysRemaining =
    submissionWindow && typeof submissionWindow.days_remaining === "number"
      ? submissionWindow.days_remaining
      : null;
  const submissionDaysRemainingDisplay =
    submissionDaysRemaining === null
      ? null
      : Math.max(0, Math.floor(submissionDaysRemaining));
  const submissionTotalDays =
    submissionWindow && typeof submissionWindow.total_days === "number"
      ? submissionWindow.total_days
      : 10;
  const submissionCountdownVariant =
    submissionDaysRemainingDisplay === null
      ? "secondary"
      : submissionDaysRemainingDisplay <= 3
      ? "danger"
      : submissionDaysRemainingDisplay <= 5
      ? "warning"
      : "success";
  const submissionCountdownLabel =
    submissionHasStarted && submissionDaysRemainingDisplay !== null
      ? `📅 ${submissionDaysRemainingDisplay} ${
          submissionDaysRemainingDisplay === 1 ? "day" : "days"
        } left to submit your forms.`
      : `📅 Countdown will begin once HR moves you to onboarding. You'll have ${submissionTotalDays}-day window to submit your forms.`;
  const isSubmissionLocked = documentOverviewMeta.submissionLocked;
  const submissionLockMessage =
    submissionWindow?.lock_reason ||
    "⏰ Submission period has ended. Please contact HR.";

  const documentsCompleted =
    Boolean(documentOverview.documents_completed) ||
    Boolean(documentOverview.documents_snapshot?.completed);

  const documentsCompletionMessage =
    documentOverview.documents_completion_message ||
    documentOverview.documents_snapshot?.completion_message ||
    "Congratulations! You've completed all document requirements. Please wait for HR's update regarding your final interview.";

  const documentsCompletionAt =
    documentOverview.documents_completion_at ||
    documentOverview.documents_snapshot?.completion_at ||
    documentOverview.documents_snapshot?.captured_at ||
    null;

  const followUpDocumentLabel = followUpTargetDocument
    ? getDocumentLabel(followUpTargetDocument)
    : "Document";

  const activeAdditionalRequirementTitle =
    activeAdditionalRequirement?.title ||
    activeAdditionalRequirementDoc?.document_name ||
    "Additional Requirement";

  const additionalRequirementDescription =
    activeAdditionalRequirement?.description ||
    activeAdditionalRequirementDoc?.description ||
    "";

  const additionalRequirementStatusLabel =
    activeAdditionalRequirement?.statusLabel ||
    activeAdditionalRequirementDoc?.status_label ||
    DOCUMENT_STATUS_CONFIG.not_submitted.label;

  const additionalRequirementStatusVariant =
    activeAdditionalRequirement?.statusVariant ||
    activeAdditionalRequirementDoc?.status_badge ||
    DOCUMENT_STATUS_CONFIG.not_submitted.variant;

  const additionalRequirementRemoteSubmission =
    activeAdditionalRequirement?.submission ||
    activeAdditionalRequirementDoc?.submission ||
    null;

  const additionalRequirementLocalFile =
    activeAdditionalRequirementKey &&
    documentUploads[activeAdditionalRequirementKey]
      ? documentUploads[activeAdditionalRequirementKey]
      : null;

  const additionalRequirementLocalPreview =
    activeAdditionalRequirementKey &&
    documentPreviews[activeAdditionalRequirementKey]
      ? documentPreviews[activeAdditionalRequirementKey]
      : null;

  const additionalRequirementUploadError =
    activeAdditionalRequirementKey &&
    uploadErrors[activeAdditionalRequirementKey]
      ? uploadErrors[activeAdditionalRequirementKey]
      : "";

  const additionalRequirementUploading =
    activeAdditionalRequirementKey &&
    uploadingDocumentKey === activeAdditionalRequirementKey;

  const additionalRequirementAllowedExt = ["pdf", "jpg", "jpeg", "png"];

  const additionalRequirementFileFormats = additionalRequirementAllowedExt
    .join(",");

  const additionalRequirementMaxSize =
    activeAdditionalRequirementDoc?.max_file_size_mb || 5;

  const additionalRequirementFileAccept = additionalRequirementAllowedExt
    .map((ext) => `.${ext}`)
    .join(",");

  const additionalRequirementSubmissionWindow =
    activeAdditionalRequirement?.submissionWindow ||
    activeAdditionalRequirementDoc?.submission_window ||
    null;

  const additionalRequirementFollowUp =
    activeAdditionalRequirement?.followUp ||
    activeAdditionalRequirementDoc?.follow_up ||
    null;

  const additionalRequirementExtensionActive =
    additionalRequirementSubmissionWindow?.extended || false;

  const rawAdditionalRequirementExtensionDaysRemaining =
    typeof additionalRequirementSubmissionWindow?.days_remaining === "number"
      ? additionalRequirementSubmissionWindow.days_remaining
      : null;
  const additionalRequirementExtensionDaysRemaining =
    rawAdditionalRequirementExtensionDaysRemaining === null
      ? null
      : Math.max(0, Math.floor(rawAdditionalRequirementExtensionDaysRemaining));

  const additionalRequirementExtensionDeadlineDisplay =
    additionalRequirementSubmissionWindow?.extension_deadline
      ? formatTimestampForDisplay(
          additionalRequirementSubmissionWindow.extension_deadline
        )
      : null;

  const additionalRequirementOriginalDays =
    typeof additionalRequirementSubmissionWindow?.original_total_days === "number"
      ? Math.floor(additionalRequirementSubmissionWindow.original_total_days)
      : submissionTotalDays;

  const additionalRequirementExtensionAddedDays =
    typeof additionalRequirementSubmissionWindow?.extension_days_total === "number" &&
    additionalRequirementSubmissionWindow.extension_days_total > 0
      ? Math.floor(additionalRequirementSubmissionWindow.extension_days_total)
      : null;

  const additionalRequirementTotalDays =
    typeof additionalRequirementSubmissionWindow?.total_days === "number"
      ? Math.floor(additionalRequirementSubmissionWindow.total_days)
      : additionalRequirementOriginalDays;

  const additionalRequirementTotalDaysDisplay =
    additionalRequirementTotalDays ??
    additionalRequirementOriginalDays ??
    submissionTotalDays;

  const additionalRequirementExtensionAddedDaysDisplay =
    additionalRequirementExtensionAddedDays &&
    additionalRequirementExtensionAddedDays > 0
      ? additionalRequirementExtensionAddedDays
      : null;

  const additionalRequirementFollowUpStatus =
    additionalRequirementFollowUp?.status?.toString().toLowerCase() || null;

  const additionalRequirementBackendCanUpload =
    typeof activeAdditionalRequirement?.canUpload === "boolean"
      ? activeAdditionalRequirement.canUpload
      : typeof activeAdditionalRequirementDoc?.can_upload === "boolean"
      ? activeAdditionalRequirementDoc.can_upload
      : true;

  const additionalRequirementUploadsLocked =
    (isSubmissionLocked ||
      activeAdditionalRequirement?.lockUploads ||
      activeAdditionalRequirementDoc?.lock_uploads) &&
    !additionalRequirementExtensionActive;

  const additionalRequirementCanUpload =
    additionalRequirementExtensionActive ||
    (additionalRequirementBackendCanUpload && !additionalRequirementUploadsLocked);

  const additionalRequirementLockReason =
    additionalRequirementExtensionActive
      ? null
      : (activeAdditionalRequirementDoc?.upload_lock_reason ||
          (isSubmissionLocked ? submissionLockMessage : null)) ?? null;

  const scrollToDocumentField = useCallback(
    (documentKey) => {
      if (!documentKey) {
        return;
      }

      setCurrentPage("onboarding");
      setActiveTab("documents");

      window.setTimeout(() => {
        const target = documentFieldRefs.current[documentKey];
        if (!target) {
          return;
        }

        const mainContent = document.querySelector(".main-content");
        if (mainContent) {
          const targetRect = target.getBoundingClientRect();
          const containerRect = mainContent.getBoundingClientRect();
          const offset =
            targetRect.top - containerRect.top + mainContent.scrollTop - 24;

          mainContent.scrollTo({
            top: offset > 0 ? offset : 0,
            behavior: "smooth",
          });
        } else {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    },
    []
  );

  const NavigationTabs = () => (
    <div
      className="row mb-4"
      style={{
        position: "sticky",

        top: "0",

        zIndex: "1001",

        backgroundColor: "white",

        paddingTop: "1rem",

        paddingBottom: "1rem",

        borderBottom: "1px solid rgba(0,0,0,0.1)",

        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <div className="col-12">
        <div className="modern-tab-container">
          <div className="tab-navigation d-flex justify-content-between align-items-center">
            {/* Home Button on Left */}

            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => (window.location.href = "/")}
              style={{
                fontFamily: "'Noto Sans', sans-serif",

                fontWeight: "500",
              }}
            >
              <FontAwesomeIcon icon={faHome} className="me-2" />
              Home
            </button>

            {/* Tabs and Notification Icon */}

            <div className="d-flex align-items-center">
              {/* Tabs */}

              <div className="d-flex me-3">
                {availableTabs.includes("status") && (
                  <button
                    className={`modern-tab ${
                      currentPage === "status" ? "active" : ""
                    }`}
                    onClick={() => {
                      setCurrentPage("status");

                      // Scroll to top when switching tabs

                      setTimeout(() => {
                        const mainContent =
                          document.querySelector(".main-content");

                        if (mainContent) {
                          mainContent.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }, 100);
                    }}
                  >
                    <span className="tab-label">Status</span>

                    <div className="tab-indicator"></div>
                  </button>
                )}

                {availableTabs.includes("interview") && (
                  <button
                    className={`modern-tab ${
                      currentPage === "interview" ? "active" : ""
                    }`}
                    onClick={() => {
                      setCurrentPage("interview");

                      // Immediately fetch fresh interview data when tab is clicked

                      fetchInterviewData();

                      // Scroll to top when switching tabs

                      setTimeout(() => {
                        const mainContent =
                          document.querySelector(".main-content");

                        if (mainContent) {
                          mainContent.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }, 100);
                    }}
                  >
                    <span className="tab-label">Interview</span>

                    <div className="tab-indicator"></div>
                  </button>
                )}

                {availableTabs.includes("offer") && (
                  <button
                    className={`modern-tab ${
                      currentPage === "offer" ? "active" : ""
                    }`}
                    onClick={() => {
                      setCurrentPage("offer");

                      // Scroll to top when switching tabs

                      setTimeout(() => {
                        const mainContent =
                          document.querySelector(".main-content");

                        if (mainContent) {
                          mainContent.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }, 100);
                    }}
                  >
                    <span className="tab-label">Job Offer</span>

                    <div className="tab-indicator"></div>
                  </button>
                )}

                {availableTabs.includes("onboarding") && (
                  <button
                    className={`modern-tab ${
                      currentPage === "onboarding" ? "active" : ""
                    }`}
                    onClick={() => {
                      setCurrentPage("onboarding");

                      // Scroll to top when switching tabs

                      setTimeout(() => {
                        const mainContent =
                          document.querySelector(".main-content");

                        if (mainContent) {
                          mainContent.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }, 100);
                    }}
                  >
                    <span className="tab-label">Onboarding</span>

                    <div className="tab-indicator"></div>
                  </button>
                )}
              </div>

              {/* Notification Icon */}

              <div
                className="notification-container"
                style={{ position: "relative" }}
              >
                <button
                  className="btn btn-outline-secondary btn-sm notification-icon"
                  onClick={handleBellIconClick}
                  style={{
                    fontFamily: "'Noto Sans', sans-serif",

                    fontWeight: "500",

                    position: "relative",
                  }}
                >
                  <FontAwesomeIcon icon={faBell} />

                  {getUnreadCount() > 0 && (
                    <span className="notification-badge">
                      {getUnreadCount()}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}

                {showNotificationDropdown && (
                  <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                      <h6 className="mb-0 fw-bold">Notifications</h6>

                      {getUnreadCount() > 0 && (
                        <span className="notification-count-badge">
                          {getUnreadCount()}
                        </span>
                      )}
                    </div>

                    <div className="notification-dropdown-content">
                      {loadingNotifications ? (
                        <div className="text-center py-3">
                          <div
                            className="spinner-border spinner-border-sm text-primary"
                            role="status"
                          >
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="text-center py-4">
                          <FontAwesomeIcon
                            icon={faBell}
                            className="text-muted mb-2"
                            size="2x"
                          />

                          <p className="text-muted small mb-0">
                            No notifications
                          </p>
                        </div>
                      ) : (
                        notifications.slice(0, 5).map((notification) => (
                          <div
                            key={notification.id}
                            className={`notification-dropdown-item ${
                              !notification.read ? "unread" : ""
                            }`}
                            onClick={() => {
                              handleNotificationClick(notification.id);

                              setShowNotificationDropdown(false);
                            }}
                          >
                            <div className="d-flex align-items-start">
                              <div className="notification-icon-small me-2">
                                <FontAwesomeIcon
                                  icon={
                                    notification.type ===
                                    "job_application_submitted"
                                      ? faCheckCircle
                                      : notification.type ===
                                        "job_application_status_changed"
                                      ? faCalendarAlt
                                      : notification.type ===
                                        "interview_scheduled"
                                      ? faCalendarAlt
                                      : notification.type ===
                                        "job_offer_received"
                                      ? faGift
                                      : faBell
                                  }
                                  className="text-primary"
                                  size="sm"
                                />
                              </div>

                              <div className="flex-grow-1">
                                <p
                                  className={`mb-0 small ${
                                    !notification.read ? "fw-bold" : ""
                                  }`}
                                >
                                  {notification.title}
                                </p>

                                <p
                                  className="mb-0 text-muted"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  {notification.message}
                                </p>

                                <small
                                  className="text-muted"
                                  style={{ fontSize: "0.7rem" }}
                                >
                                  {notification.time}
                                </small>
                              </div>

                              {!notification.read && (
                                <div className="notification-dot"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="notification-dropdown-footer">
                        <button
                          className="btn btn-link btn-sm text-decoration-none w-100"
                          onClick={() => {
                            setCurrentPage("application-status");

                            setShowNotificationDropdown(false);
                          }}
                        >
                          View All Notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="onboarding-container">
        <NavigationTabs />

        <div
          className="main-content"
          style={{
            height: "calc(100vh - 120px)",

            overflowY: "auto",

            overflowX: "hidden",

            paddingBottom: "2rem",
          }}
        >
          {currentPage === "application-status" && (
            <div className="container-fluid p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="mb-0">
                  <FontAwesomeIcon
                    icon={faBell}
                    className="me-2 text-primary"
                  />
                  All Notifications
                </h4>

                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setCurrentPage("application-status")}
                >
                  <FontAwesomeIcon icon={faTimes} className="me-1" />
                  Close
                </button>
              </div>

              {/* Action Controls */}

              <div className="notification-controls mb-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="selectAll"
                      checked={isAllSelected()}
                      onChange={handleSelectAll}
                    />

                    <label className="form-check-label" htmlFor="selectAll">
                      Select All
                    </label>
                  </div>

                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={handleReadAll}
                    disabled={notifications.length === 0}
                  >
                    <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                    Read All
                  </button>

                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={
                      getSelectedCount() > 0
                        ? handleDeleteSelected
                        : handleDeleteAll
                    }
                    disabled={notifications.length === 0}
                  >
                    <FontAwesomeIcon icon={faTimes} className="me-1" />

                    {getSelectedCount() > 0
                      ? `Delete Selected (${getSelectedCount()})`
                      : "Delete All"}
                  </button>
                </div>
              </div>

              <div className="messages-list">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`message-item ${
                      notification.selected ? "selected" : ""
                    } ${!notification.read ? "unread" : ""}`}
                  >
                    <div className="d-flex align-items-start">
                      {/* Checkbox */}

                      <div className="form-check me-3 mt-1">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={notification.selected}
                          onChange={() =>
                            handleToggleSelection(notification.id)
                          }
                        />
                      </div>

                      {/* Notification Icon */}

                      <div className="message-icon me-3">
                        <FontAwesomeIcon
                          icon={
                            notification.id === 1
                              ? faCheckCircle
                              : notification.id === 2
                              ? faClock
                              : notification.id === 3
                              ? faBuilding
                              : notification.id === 4
                              ? faCalendarAlt
                              : notification.id === 5
                              ? faGift
                              : faBell
                          }
                          className={
                            notification.id === 1
                              ? "text-success"
                              : notification.id === 2
                              ? "text-warning"
                              : notification.id === 3
                              ? "text-info"
                              : notification.id === 4
                              ? "text-primary"
                              : notification.id === 5
                              ? "text-success"
                              : "text-secondary"
                          }
                        />
                      </div>

                      {/* Notification Content */}

                      <div className="flex-grow-1">
                        <h6
                          className={`mb-1 ${
                            !notification.read ? "fw-bold" : ""
                          }`}
                        >
                          {notification.title}
                        </h6>

                        <p className="text-muted mb-1">
                          {notification.message}
                        </p>

                        <small className="text-muted">
                          {notification.time}
                        </small>
                      </div>

                      {/* Action Buttons */}

                      <div className="notification-actions ms-3">
                        {!notification.read && (
                          <button
                            className="btn btn-outline-primary btn-sm me-2"
                            onClick={() => handleMarkRead(notification.id)}
                            title="Mark as read"
                          >
                            <FontAwesomeIcon icon={faCheckCircle} />
                          </button>
                        )}

                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDelete(notification.id)}
                          title="Delete notification"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {notifications.length === 0 && (
                  <div className="text-center py-5">
                    <FontAwesomeIcon
                      icon={faBell}
                      className="text-muted mb-3"
                      style={{ fontSize: "3rem" }}
                    />

                    <h5 className="text-muted">No notifications</h5>

                    <p className="text-muted">You're all caught up!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentPage === "status" && (
            <div className="container-fluid p-4">
              <div
                className="weather-date-bar mb-3 px-4 py-2"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(248,249,252,0.95), rgba(255,255,255,0.95))",
                  borderRadius: "14px",
                  border: "1px solid rgba(0,0,0,0.05)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <span
                  className="text-muted"
                  style={{ fontWeight: 600, letterSpacing: "0.02em" }}
                >
                  {formattedCurrentDate}
                </span>

                {weatherDisplayText && (
                  <span
                    className="text-muted"
                    style={{ fontWeight: 600, letterSpacing: "0.02em" }}
                  >
                    {weatherDisplayText}
                  </span>
                )}
              </div>

              <div
                className="welcome-banner mb-4 p-4"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(84,112,198,0.1), rgba(45,197,253,0.12))",
                  borderRadius: "18px",
                  border: "1px solid rgba(84,112,198,0.18)",
                }}
              >
                <div className="d-flex align-items-center flex-wrap gap-4">
                  <div
                    className="welcome-avatar-wrapper"
                    style={{
                      width: "72px",
                      height: "72px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "3px solid rgba(37, 99, 235, 0.25)",
                      boxShadow: "0 8px 20px rgba(37, 99, 235, 0.15)",
                      backgroundColor: "white",
                    }}
                  >
                    <img
                      src={displayedAvatarUrl}
                      alt={`${welcomeName || "Applicant"} avatar`}
                      onError={handleAvatarError}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>

                  <div className="flex-grow-1">
                    <h2 className="mb-1" style={{ fontWeight: 700 }}>
                      Welcome,{" "}
                      <span className="text-primary">{welcomeName}</span>!
                    </h2>

                    <p className="mb-0 text-muted">{greetingSubtext}</p>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-12">
                  <div className="card mb-4">
                    <div className="card-body">
                      {primaryApplication ? (
                        <>
                          <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
                            <div>
                              <h5 className="card-title d-flex align-items-center mb-1">
                        <FontAwesomeIcon
                          icon={faChartLine}
                          className="me-2 text-primary"
                        />
                                Application Progress
                      </h5>

                              <p className="text-muted mb-0">
                                Current stage:{" "}
                                <span className="fw-semibold text-primary">
                                  {currentStageLabel}
                                </span>
                              </p>
                            </div>

                            {currentStatusConfig.badgeLabel && (
                              <div className="text-end">
                                <span className={currentStatusConfig.badgeClass}>
                                  {currentStatusConfig.badgeLabel}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="application-progress-visual mb-4">
                            <div
                              style={{
                                position: "relative",
                                padding: "24px 0 12px",
                              }}
                            >
                              <div
                                style={{
                                  position: "absolute",
                                  top: "20px",
                                  left: 0,
                                  right: 0,
                                  height: "4px",
                                  borderRadius: "999px",
                                  backgroundColor: "#e5e7eb",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${stageProgressPercent}%`,
                                    height: "100%",
                                    borderRadius: "999px",
                                    background:
                                      "linear-gradient(90deg, #2563eb, #38bdf8)",
                                  }}
                                />
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: "0.75rem",
                                  position: "relative",
                                  zIndex: 1,
                                  flexWrap: "wrap",
                                }}
                              >
                                {applicationStages.map((stage, index) => {
                                  const isCompleted = index < currentStageIndex;
                                  const isActive = index === currentStageIndex;
                                  const circleBorder =
                                    isActive || isCompleted
                                      ? "#2563eb"
                                      : "#d1d5db";
                                  const circleBg = isActive
                                    ? "#eff6ff"
                                    : isCompleted
                                    ? "#dbeafe"
                                    : "#f9fafb";
                                  const circleColor =
                                    isActive || isCompleted
                                      ? "#1d4ed8"
                                      : "#6b7280";
                                  const labelColor = isActive
                                    ? "#1d4ed8"
                                    : isCompleted
                                    ? "#1f2937"
                                    : "#6b7280";

                                  return (
                                    <div
                                      key={stage}
                                      style={{
                                        minWidth: "90px",
                                        flex: "1 1 90px",
                                        textAlign: "center",
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: "44px",
                                          height: "44px",
                                          borderRadius: "50%",
                                          margin: "0 auto",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          border: `3px solid ${circleBorder}`,
                                          backgroundColor: circleBg,
                                          color: circleColor,
                                          fontWeight: 600,
                                        }}
                                      >
                                        {index + 1}
                                      </div>

                                      <div
                                        style={{
                                          marginTop: "0.5rem",
                                          fontSize: "0.85rem",
                                          fontWeight: isActive ? 600 : 500,
                                          color: labelColor,
                                        }}
                                      >
                                        {stage}
                                        {isActive && (
                                          <div
                                            style={{
                                              marginTop: "0.25rem",
                                              fontSize: "0.7rem",
                                              color: "#64748b",
                                              fontWeight: 500,
                                            }}
                                          >
                                            You are here
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="status-display">
                            <div className="d-flex align-items-center flex-wrap gap-3 mb-3">
                              <div
                                className="d-flex align-items-center justify-content-center"
                                style={{
                                  width: "60px",
                                  height: "60px",
                                  borderRadius: "18px",
                                  backgroundColor:
                                    currentStatusConfig.iconBackground,
                                  color: currentStatusConfig.iconColor,
                                  fontSize: "1.6rem",
                                }}
                              >
                                <FontAwesomeIcon icon={currentStatusConfig.icon} />
                              </div>

                              <div>
                                <h4
                                  className={`mb-1 fw-bold ${currentStatusConfig.titleClass}`}
                                >
                                  {currentStatusConfig.title}
                                </h4>

                                {currentStatusConfig.appliedDate && (
                                <small className="text-muted">
                                    Applied: {currentStatusConfig.appliedDate}
                                </small>
                                )}
                              </div>
                            </div>

                            <div className="status-message p-3 bg-light rounded mb-3">
                              <p className="mb-2 fw-medium">
                                {currentStatusConfig.message}
                              </p>

                              <p className="text-muted mb-0">
                                {currentStatusConfig.subtext}
                              </p>
                              <div
                                className="mt-3 d-flex align-items-center flex-wrap gap-2"
                                style={{
                                  fontSize: "0.85rem",
                                  color: "#64748b",
                                }}
                              >
                                <span
                                  className="badge rounded-pill bg-light text-primary"
                                  style={{
                                    border: "1px solid rgba(37,99,235,0.2)",
                                    fontWeight: 600,
                                  }}
                                >
                                  Stage {currentStageIndex + 1} of{" "}
                                  {applicationStages.length}
                                </span>
                                <span>Progress tracker updated accordingly.</span>
                              </div>
                            </div>

                            <div
                              className="next-step mt-3 p-3 border-start border-3 bg-info bg-opacity-10"
                              style={{ borderColor: "rgba(14, 165, 233, 0.3)" }}
                            >
                              <h6 className="text-info mb-2">
                                <FontAwesomeIcon
                                  icon={faLightbulb}
                                  className="me-2"
                                />
                                Next Step
                              </h6>

                              <p className="mb-0">
                                {currentStatusConfig.nextStep}
                              </p>

                              <div
                                className="mt-2"
                                style={{ fontSize: "0.85rem", color: "#64748b" }}
                            >
                              <FontAwesomeIcon
                                  icon={faChartLine}
                                  className="me-2 text-primary"
                                />
                                Aligned with{" "}
                                <span className="fw-semibold text-primary">
                                  Stage {currentStageIndex + 1}:{" "}
                                  {currentStageLabel}
                                </span>{" "}
                                on the progress tracker.
                          </div>
                            </div>
                      </div>

                      <div className="mt-4">
                          <button
                            className="btn btn-primary"
                            onClick={handleViewApplication}
                          >
                            <FontAwesomeIcon
                              icon={faFileAlt}
                              className="me-2"
                            />
                            View Application
                          </button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-4">
                            <FontAwesomeIcon
                              icon={faFileAlt}
                              className="text-muted mb-3"
                              size="3x"
                            />

                            <h5 className="text-muted mb-2">
                              No Application Found
                            </h5>

                            <p className="text-muted mb-3">
                              You haven't submitted any job applications yet.
                            </p>

                            <button
                              className="btn btn-primary"
                              onClick={() => (window.location.href = "/")}
                            >
                            <FontAwesomeIcon icon={faSearch} className="me-2" />
                              Browse Jobs
                        </button>
                      </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interview Tab */}

          {currentPage === "interview" && (
            <div className="container-fluid p-4">
              {/* Loading State */}

              {loadingInterview && (
                <div className="interview-loading-container">
                  <div className="text-center py-5">
                    <div
                      className="spinner-border text-primary mb-3"
                      role="status"
                    >
                      <span className="visually-hidden">Loading...</span>
                    </div>

                    <h5 className="text-muted">
                      Loading interview information...
                    </h5>

                    <p className="text-muted">
                      Please wait while we fetch your interview details.
                    </p>
                  </div>
                </div>
              )}

              {/* Empty State */}

              {!loadingInterview && interviewData.length === 0 && (
                <div className="interview-empty-state">
                  <div className="text-center py-5">
                    <div className="interview-empty-icon mb-4">
                      <FontAwesomeIcon icon={faCalendarAlt} />
                    </div>

                    <h4 className="text-muted mb-3">
                      No interviews scheduled yet.
                    </h4>

                    <p className="text-muted mb-4">
                      You don't have any interviews scheduled at the moment.
                      <br />
                      Check back later or contact HR for updates.
                    </p>

                    <div className="d-flex gap-2 justify-content-center">
                      <button
                        className="btn btn-primary"
                        onClick={fetchInterviewData}
                      >
                        <FontAwesomeIcon icon={faRefresh} className="me-2" />
                        Check Again
                      </button>

                      <button
                        className="btn btn-info"
                        onClick={() => {
                          console.log("🔍 [PersonalOnboarding] Debug Info:");

                          console.log(
                            "User:",
                            JSON.parse(localStorage.getItem("user") || "{}")
                          );

                          console.log("Applications:", userApplications);

                          console.log("Interview Data:", interviewData);

                          alert(
                            "Debug info logged to console. Check browser console for details."
                          );
                        }}
                      >
                        <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                        Debug Info
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Interview Cards */}

              {!loadingInterview && interviewData.length > 0 && (
                <div className="row">
                  {interviewData.map((interview, index) => (
                    <div key={interview.id || index} className="col-12 mb-4">
                      <div className="interview-card">
                        {/* Card Header */}

                        <div className="interview-card-header">
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                              <div className="interview-icon-wrapper">
                                <FontAwesomeIcon icon={faCalendarAlt} />
                              </div>

                              <div>
                                <h5 className="mb-1 text-white">
                                  Interview Invitation
                                </h5>

                                <p className="mb-0 text-white-50 small">
                                  {interview.application?.job_posting?.title ||
                                    "Position"}
                                </p>
                              </div>
                            </div>

                            <div className="interview-status-badge">
                              <FontAwesomeIcon
                                icon={faClock}
                                className="me-1"
                              />

                              {interview.status?.charAt(0).toUpperCase() +
                                interview.status?.slice(1)}
                            </div>
                          </div>
                        </div>

                        {/* Card Body */}

                        <div className="interview-card-body">
                          {/* Interview Details Grid */}

                          <div className="interview-details-grid">
                            {/* Date & Time Section */}

                            <div className="interview-detail-section">
                              <h6 className="section-title">
                                <FontAwesomeIcon
                                  icon={faCalendarAlt}
                                  className="me-2"
                                />
                                📅 Date & Time Information
                              </h6>

                              <div className="detail-items">
                                <div className="detail-item">
                                  <div className="detail-icon">
                                    <FontAwesomeIcon icon={faCalendarAlt} />
                                  </div>

                                  <div className="detail-content">
                                    <label>📅 Interview Date</label>

                                    <span>
                                      {formatInterviewDateSafe(
                                        interview.interview_date
                                      )}
                                    </span>
                                  </div>
                                </div>

                                <div className="detail-item">
                                  <div className="detail-icon">
                                    <FontAwesomeIcon icon={faClock} />
                                  </div>

                                  <div className="detail-content">
                                    <label>🕐 Interview Time</label>

                                    <span>
                                      {formatInterviewTimeSafe(
                                        interview.interview_time ||
                                          interview.interviewTime
                                      )}
                                    </span>
                                  </div>
                                </div>

                                <div className="detail-item">
                                  <div className="detail-icon">
                                    <FontAwesomeIcon icon={faClock} />
                                  </div>

                                  <div className="detail-content">
                                    <label>🕑 Interview End Time</label>

                                    <span>
                                      {formatInterviewTimeSafe(
                                        interview.end_time || interview.endTime
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Location & Contact Section */}

                            <div className="interview-detail-section">
                              <h6 className="section-title">
                                <FontAwesomeIcon
                                  icon={faMapMarkerAlt}
                                  className="me-2"
                                />
                                📍 Location & Contact Details
                              </h6>

                              <div className="detail-items">
                                <div className="detail-item">
                                  <div className="detail-icon">
                                    <FontAwesomeIcon icon={faBuilding} />
                                  </div>

                                  <div className="detail-content">
                                    <label>🏢 Interview Type</label>

                                    <span className="text-capitalize">
                                      {interview.interview_type || "On-site"}
                                    </span>
                                  </div>
                                </div>

                                <div className="detail-item">
                                  <div className="detail-icon">
                                    <FontAwesomeIcon icon={faMapMarkerAlt} />
                                  </div>

                                  <div className="detail-content">
                                    <label>📍 Location</label>

                                    <span>{interview.location}</span>
                                  </div>
                                </div>

                                <div className="detail-item">
                                  <div className="detail-icon">
                                    <FontAwesomeIcon icon={faUserTie} />
                                  </div>

                                  <div className="detail-content">
                                    <label>👤 Interviewer</label>

                                    <span>{interview.interviewer}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Notes Section */}

                          {interview.notes && (
                            <div className="interview-notes-section">
                              <h6 className="section-title">
                                <FontAwesomeIcon
                                  icon={faInfoCircle}
                                  className="me-2"
                                />
                                Additional Notes & Instructions
                              </h6>

                              <div className="notes-content">
                                <FontAwesomeIcon
                                  icon={faLightbulb}
                                  className="me-2"
                                />

                                {interview.notes}
                              </div>
                            </div>
                          )}

                          {/* Feedback Section */}

                          {interview.feedback && (
                            <div className="interview-feedback-section">
                              <h6 className="section-title">
                                <FontAwesomeIcon
                                  icon={faCheckCircle}
                                  className="me-2"
                                />
                                Interview Feedback
                              </h6>

                              <div className="feedback-content">
                                {interview.feedback}
                              </div>
                            </div>
                          )}

                          {/* Preparation Tips */}

                          <div className="interview-tips-section">
                            <h6 className="section-title">
                              <FontAwesomeIcon
                                icon={faLightbulb}
                                className="me-2"
                              />
                              Interview Preparation Tips
                            </h6>

                            <div className="tips-grid">
                              <div className="tip-item">
                                <FontAwesomeIcon
                                  icon={faCheckCircle}
                                  className="tip-icon"
                                />

                                <span>Arrive 10-15 minutes early</span>
                              </div>

                              <div className="tip-item">
                                <FontAwesomeIcon
                                  icon={faCheckCircle}
                                  className="tip-icon"
                                />

                                <span>Bring valid government ID</span>
                              </div>

                              <div className="tip-item">
                                <FontAwesomeIcon
                                  icon={faCheckCircle}
                                  className="tip-icon"
                                />

                                <span>Dress professionally</span>
                              </div>

                              <div className="tip-item">
                                <FontAwesomeIcon
                                  icon={faCheckCircle}
                                  className="tip-icon"
                                />

                                <span>
                                  Prepare questions for the interviewer
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentPage === "offer" && (
            <div className="container-fluid p-4">
              {/* Header */}

              <div className="d-flex align-items-center justify-content-between mb-3">
                <h4
                  className="mb-0 offer-header-title"
                  style={{ color: "#28a745", fontWeight: "600" }}
                >
                  Congratulations! You Have Been Accepted
                </h4>
              </div>

              <div className="card offer-card">
                <div className="card-body p-4">
                  {/* Company Block */}

                  <div className="mb-4">
                    <div>
                      <h5 className="mb-1 company-name">
                        {onboardingData?.company?.name ||
                          "Cabuyao Concrete Development Corporation"}
                      </h5>

                      <p className="text-muted mb-4">
                        Congratulations! You have been offered a position with
                        our organization. We are pleased to extend this
                        opportunity and believe your skills will make a valuable
                        contribution to our team. Please review the offer
                        details carefully, including the compensation, work
                        schedule, and start date. For any questions or
                        clarifications, feel free to contact our HR department.
                        We look forward to your response.
                      </p>

                      {/* Offer Details Section */}

                      <div className="offer-details-section mb-4">
                        <h6
                          className="mb-4 text-dark fw-semibold"
                          style={{
                            color: "#495057",

                            fontSize: "1.1rem",

                            borderBottom: "2px solid #007bff",

                            paddingBottom: "0.5rem",
                          }}
                        >
                          Offer Details
                        </h6>

                        <div className="row g-3">
                          {/* Department & Position */}

                          <div className="col-md-6 col-lg-4">
                            <div
                              className="detail-card"
                              style={{
                                backgroundColor: "white",

                                padding: "1.25rem",

                                borderRadius: "8px",

                                border: "1px solid #dee2e6",

                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",

                                height: "100%",
                              }}
                            >
                              <h6
                                className="detail-title mb-3"
                                style={{
                                  color: "#007bff",

                                  fontSize: "1rem",

                                  fontWeight: "600",
                                }}
                              >
                                Department & Position
                              </h6>

                              <div
                                className="detail-value"
                                style={{ fontSize: "1rem", color: "#495057" }}
                              >
                                <div className="mb-2">
                                  <strong>Department:</strong>{" "}
                                  {userApplications[0]?.department || "—"}
                                </div>

                                <div className="mb-0">
                                  <strong>Position:</strong>{" "}
                                  {userApplications[0]?.position ||
                                    userApplications[0]?.job_title ||
                                    "—"}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Employment Type */}

                          <div className="col-md-6 col-lg-4">
                            <div
                              className="detail-card"
                              style={{
                                backgroundColor: "white",

                                padding: "1.25rem",

                                borderRadius: "8px",

                                border: "1px solid #dee2e6",

                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",

                                height: "100%",
                              }}
                            >
                              <h6
                                className="detail-title mb-3"
                                style={{
                                  color: "#007bff",

                                  fontSize: "1rem",

                                  fontWeight: "600",
                                }}
                              >
                                Employment Type
                              </h6>

                              <div
                                className="detail-value"
                                style={{ fontSize: "1rem", color: "#495057" }}
                              >
                                Full-time
                              </div>
                            </div>
                          </div>

                          {/* Salary */}

                          <div className="col-md-6 col-lg-4">
                            <div
                              className="detail-card"
                              style={{
                                backgroundColor: "white",

                                padding: "1.25rem",

                                borderRadius: "8px",

                                border: "1px solid #dee2e6",

                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",

                                height: "100%",
                              }}
                            >
                              <h6
                                className="detail-title mb-3"
                                style={{
                                  color: "#007bff",

                                  fontSize: "1rem",

                                  fontWeight: "600",
                                }}
                              >
                                Salary
                              </h6>

                              <div
                                className="detail-value"
                                style={{ fontSize: "1rem", color: "#495057" }}
                              >
                                {jobOfferData?.salary ||
                                  onboardingData?.offer?.salary ||
                                  "—"}
                              </div>
                            </div>
                          </div>

                          {/* Payment Schedule */}

                          <div className="col-md-6 col-lg-4">
                            <div
                              className="detail-card"
                              style={{
                                backgroundColor: "white",

                                padding: "1.25rem",

                                borderRadius: "8px",

                                border: "1px solid #dee2e6",

                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",

                                height: "100%",
                              }}
                            >
                              <h6
                                className="detail-title mb-3"
                                style={{
                                  color: "#007bff",

                                  fontSize: "1rem",

                                  fontWeight: "600",
                                }}
                              >
                                Payment Schedule
                              </h6>

                              <div
                                className="detail-value"
                                style={{ fontSize: "1rem", color: "#495057" }}
                              >
                                {jobOfferData?.payment_schedule ||
                                  onboardingData?.offer?.payment_schedule ||
                                  "Monthly"}
                              </div>
                            </div>
                          </div>

                          {/* Work Setup */}

                          <div className="col-md-6 col-lg-4">
                            <div
                              className="detail-card"
                              style={{
                                backgroundColor: "white",

                                padding: "1.25rem",

                                borderRadius: "8px",

                                border: "1px solid #dee2e6",

                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",

                                height: "100%",
                              }}
                            >
                              <h6
                                className="detail-title mb-3"
                                style={{
                                  color: "#007bff",

                                  fontSize: "1rem",

                                  fontWeight: "600",
                                }}
                              >
                                Work Setup
                              </h6>

                              <div
                                className="detail-value"
                                style={{ fontSize: "0.9rem", color: "#6c757d" }}
                              >
                                {jobOfferData?.work_setup ||
                                  onboardingData?.offer?.work_setup ||
                                  "Onsite only"}
                              </div>
                            </div>
                          </div>

                          {/* Offer Validity */}

                          <div className="col-md-6 col-lg-4">
                            <div
                              className="detail-card"
                              style={{
                                backgroundColor: "white",

                                padding: "1.25rem",

                                borderRadius: "8px",

                                border: "1px solid #dee2e6",

                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",

                                height: "100%",
                              }}
                            >
                              <h6
                                className="detail-title mb-3"
                                style={{
                                  color: "#007bff",

                                  fontSize: "1rem",

                                  fontWeight: "600",
                                }}
                              >
                                Offer Validity
                              </h6>

                              <div
                                className="detail-value"
                                style={{ fontSize: "0.9rem", color: "#6c757d" }}
                              >
                                {jobOfferData?.offer_validity ||
                                  onboardingData?.offer?.offer_validity ||
                                  "7 days from offer date"}
                              </div>
                            </div>
                          </div>

                          {/* Contact Person */}

                          <div className="col-md-6 col-lg-4">
                            <div
                              className="detail-card"
                              style={{
                                backgroundColor: "white",

                                padding: "1.25rem",

                                borderRadius: "8px",

                                border: "1px solid #dee2e6",

                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",

                                height: "100%",
                              }}
                            >
                              <h6
                                className="detail-title mb-3"
                                style={{
                                  color: "#007bff",

                                  fontSize: "1rem",

                                  fontWeight: "600",
                                }}
                              >
                                Contact Person
                              </h6>

                              <div
                                className="detail-value"
                                style={{ fontSize: "0.9rem", color: "#6c757d" }}
                              >
                                {jobOfferData?.contact_person ||
                                  onboardingData?.offer?.contact_person ||
                                  "HR Department"}
                              </div>
                            </div>
                          </div>

                          {/* Contact Number */}

                          <div className="col-md-6 col-lg-4">
                            <div
                              className="detail-card"
                              style={{
                                backgroundColor: "white",

                                padding: "1.25rem",

                                borderRadius: "8px",

                                border: "1px solid #dee2e6",

                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",

                                height: "100%",
                              }}
                            >
                              <h6
                                className="detail-title mb-3"
                                style={{
                                  color: "#007bff",

                                  fontSize: "1rem",

                                  fontWeight: "600",
                                }}
                              >
                                Contact Number
                              </h6>

                              <div
                                className="detail-value"
                                style={{ fontSize: "0.9rem", color: "#6c757d" }}
                              >
                                {jobOfferData?.contact_number ||
                                  onboardingData?.offer?.contact_number ||
                                  "(02) 1234-5678"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}

                  <div className="mt-4">
                    {userApplications[0]?.status === "Offer Accepted" ? (
                      <div
                        className="alert alert-success d-flex align-items-center"
                        role="alert"
                        style={{
                          borderRadius: "8px",

                          padding: "1rem 1.5rem",

                          fontSize: "1.1rem",

                          fontWeight: "600",
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faCheckCircle}
                          className="me-2"
                          style={{ fontSize: "1.5rem" }}
                        />
                        Offer Accepted
                      </div>
                    ) : (
                      <div className="d-flex flex-wrap gap-2">
                        <button
                          className="btn btn-primary d-flex align-items-center"
                          onClick={handleAcceptOffer}
                          disabled={acceptingOffer}
                        >
                          {acceptingOffer ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                                aria-hidden="true"
                              ></span>
                              Processing...
                            </>
                          ) : (
                            <>
                              <FontAwesomeIcon
                                icon={faCheckCircle}
                                className="me-2"
                              />
                              Accept Offer
                            </>
                          )}
                        </button>

                        <button
                          className="btn btn-outline-secondary d-flex align-items-center"
                          onClick={handleDeclineOffer}
                          disabled={acceptingOffer}
                        >
                          <FontAwesomeIcon icon={faTimes} className="me-2" />
                          Decline Offer
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 text-muted small">
                    If you have any questions, please reach out to{" "}
                    {jobOfferData?.contact_person || "HR"} at{" "}
                    <span className="fw-semibold">hr@company.com</span> or{" "}
                    <span className="fw-semibold">
                      {jobOfferData?.contact_number || "(02) 1234-5678"}
                    </span>
                    .
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentPage === "onboarding" && (
            <div className="container-fluid p-4">
              {/* Onboarding Sub-Navigation */}

              <div className="onboarding-subnav mb-4">
                <button
                  className={`subnav-item ${
                    activeTab === "documents" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("documents")}
                >
                  Document Submission
                </button>

                <button
                  className={`subnav-item ${
                    activeTab === "benefits" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("benefits")}
                >
                  Benefits Overview
                </button>

                <button
                  className={`subnav-item ${
                    activeTab === "profile" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("profile")}
                >
                  Profile Creation
                </button>

                <button
                  className={`subnav-item ${
                    activeTab === "overview" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("overview")}
                >
                  Orientation Schedule
                </button>

                <button
                  className={`subnav-item ${
                    activeTab === "starting-date" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("starting-date")}
                >
                  Start Date
                </button>
              </div>

              {/* Content based on activeTab */}

              {activeTab === "overview" && (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="mb-0">
                      <FontAwesomeIcon
                        icon={faCalendarAlt}
                        className="me-2 text-primary"
                      />
                      Orientation Schedule
                    </h4>

                    {orientationData && orientationData.createdAt && (
                      <span className="badge bg-info">
                        <FontAwesomeIcon icon={faClock} className="me-1" />
                        Last Updated:{" "}
                        {new Date(orientationData.createdAt).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                      </span>
                    )}
                  </div>

                  {orientationData ? (
                    <>
                      <div className="card border-0 shadow-sm">
                        <div className="card-body p-4">
                          <div className="row">
                            {/* Left Column - Date & Time Info */}

                            <div className="col-md-6">
                              <div className="orientation-info-section mb-4">
                                <h5 className="text-primary mb-3">
                                  <FontAwesomeIcon
                                    icon={faCalendarAlt}
                                    className="me-2"
                                  />
                                  Date & Time
                                </h5>

                                <div className="info-item d-flex align-items-start mb-3">
                                  <div className="info-icon-wrapper me-3">
                                    <FontAwesomeIcon
                                      icon={faCalendarAlt}
                                      className="text-info"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-muted small mb-1">
                                      Date
                                    </label>

                                    <p className="mb-0 fw-medium">
                                      {new Date(
                                        orientationData.orientationDate
                                      ).toLocaleDateString("en-US", {
                                        weekday: "long",

                                        year: "numeric",

                                        month: "long",

                                        day: "numeric",
                                      })}
                                    </p>
                                  </div>
                                </div>

                                <div className="info-item d-flex align-items-start mb-3">
                                  <div className="info-icon-wrapper me-3">
                                    <FontAwesomeIcon
                                      icon={faClock}
                                      className="text-warning"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-muted small mb-1">
                                      Time
                                    </label>

                                    <p className="mb-0 fw-medium">
                                      {orientationData.orientationTime}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="orientation-info-section mb-4">
                                <h5 className="text-primary mb-3">
                                  <FontAwesomeIcon
                                    icon={faBuilding}
                                    className="me-2"
                                  />
                                  Type & Location
                                </h5>

                                <div className="info-item d-flex align-items-start mb-3">
                                  <div className="info-icon-wrapper me-3">
                                    <FontAwesomeIcon
                                      icon={faBuilding}
                                      className="text-success"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-muted small mb-1">
                                      Type
                                    </label>

                                    <p className="mb-0">
                                      <span
                                        className={`badge ${
                                          orientationData.orientationType ===
                                          "in-person"
                                            ? "bg-primary"
                                            : orientationData.orientationType ===
                                              "online"
                                            ? "bg-info"
                                            : "bg-success"
                                        }`}
                                      >
                                        {orientationData.orientationType ===
                                        "in-person"
                                          ? "In-Person"
                                          : orientationData.orientationType ===
                                            "online"
                                          ? "Online"
                                          : orientationData.orientationType}
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                <div className="info-item d-flex align-items-start">
                                  <div className="info-icon-wrapper me-3">
                                    <FontAwesomeIcon
                                      icon={faMapMarkerAlt}
                                      className="text-danger"
                                    />
                                  </div>

                                  <div className="flex-grow-1">
                                    <label className="text-muted small mb-1">
                                      {orientationData.orientationType ===
                                      "online"
                                        ? "Meeting Link"
                                        : "Venue"}
                                    </label>

                                    {orientationData.orientationType ===
                                    "online" ? (
                                      <a
                                        href={
                                          orientationData.venue.startsWith(
                                            "http"
                                          )
                                            ? orientationData.venue
                                            : `https://${orientationData.venue}`
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary fw-medium text-decoration-none d-inline-flex align-items-center"
                                      >
                                        {orientationData.venue}

                                        <FontAwesomeIcon
                                          icon={faEye}
                                          className="ms-2"
                                          size="sm"
                                        />
                                      </a>
                                    ) : (
                                      <p className="mb-0 fw-medium">
                                        {orientationData.venue}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Right Column - Facilitator & Instructions */}

                            <div className="col-md-6">
                              <div className="orientation-info-section mb-4">
                                <h5 className="text-primary mb-3">
                                  <FontAwesomeIcon
                                    icon={faUserTie}
                                    className="me-2"
                                  />
                                  Facilitator
                                </h5>

                                <div className="info-item d-flex align-items-start">
                                  <div className="info-icon-wrapper me-3">
                                    <FontAwesomeIcon
                                      icon={faUserTie}
                                      className="text-primary"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-muted small mb-1">
                                      Facilitator Name
                                    </label>

                                    <p className="mb-0 fw-medium">
                                      {orientationData.facilitator}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="orientation-info-section">
                                <h5 className="text-primary mb-3">
                                  <FontAwesomeIcon
                                    icon={faInfoCircle}
                                    className="me-2"
                                  />
                                  Notes & Instructions
                                </h5>

                                <div className="alert alert-info mb-0">
                                  <div className="d-flex align-items-start">
                                    <FontAwesomeIcon
                                      icon={faLightbulb}
                                      className="mt-1 me-2"
                                    />

                                    <div>
                                      <p className="mb-0">
                                        {orientationData.notes ||
                                          "No additional notes provided."}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}

                          <div className="mt-4 pt-4 border-top">
                            <div className="d-flex justify-content-between align-items-center flex-wrap">
                              <div>
                                <label className="text-muted small mb-1">
                                  Status
                                </label>

                                <div>
                                  <span
                                    className={`badge ${
                                      orientationData.status === "scheduled"
                                        ? "bg-primary"
                                        : orientationData.status ===
                                          "rescheduled"
                                        ? "bg-warning"
                                        : orientationData.status === "completed"
                                        ? "bg-success"
                                        : orientationData.status === "cancelled"
                                        ? "bg-danger"
                                        : "bg-secondary"
                                    } px-3 py-2`}
                                  >
                                    <FontAwesomeIcon
                                      icon={faCheckCircle}
                                      className="me-2"
                                    />

                                    {orientationData.status
                                      ?.charAt(0)
                                      .toUpperCase() +
                                      orientationData.status?.slice(1)}
                                  </span>
                                </div>
                              </div>

                              {orientationData.attendees && (
                                <div className="text-end">
                                  <label className="text-muted small mb-1">
                                    Other Attendees
                                  </label>

                                  <p className="mb-0 small">
                                    {orientationData.attendees}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Attendance Confirmation Section */}

                          <div className="mt-4 pt-4 border-top">
                            <label className="text-muted small mb-3 d-block fw-bold">
                              <FontAwesomeIcon
                                icon={faUserCheck}
                                className="me-2"
                              />
                              ATTENDANCE CONFIRMATION
                            </label>

                            {attendanceStatus === null ? (
                              <div className="d-flex flex-column gap-2">
                                <div className="alert alert-warning mb-3">
                                  <FontAwesomeIcon
                                    icon={faInfoCircle}
                                    className="me-2"
                                  />
                                  Please confirm your attendance for this
                                  orientation session.
                                </div>

                                <div className="d-flex gap-2 flex-wrap">
                                  <button
                                    className="btn btn-success d-flex align-items-center"
                                    onClick={handleConfirmAttendance}
                                    style={{ flex: "1 1 auto" }}
                                  >
                                    <FontAwesomeIcon
                                      icon={faCheckCircle}
                                      className="me-2"
                                    />
                                    Confirm Attendance
                                  </button>

                                  <button
                                    className="btn btn-outline-danger d-flex align-items-center"
                                    onClick={handleDeclineAttendance}
                                    style={{ flex: "1 1 auto" }}
                                  >
                                    <FontAwesomeIcon
                                      icon={faTimesCircle}
                                      className="me-2"
                                    />
                                    Cannot Attend
                                  </button>
                                </div>
                              </div>
                            ) : attendanceStatus === "confirmed" ? (
                              <div className="alert alert-success mb-0">
                                <div className="d-flex align-items-center justify-content-between flex-wrap">
                                  <div className="d-flex align-items-center">
                                    <FontAwesomeIcon
                                      icon={faCheckCircle}
                                      className="me-2"
                                      size="lg"
                                    />

                                    <div>
                                      <strong>Attendance Confirmed</strong>

                                      <p className="mb-0 small">
                                        You have confirmed your attendance. We
                                        look forward to seeing you!
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    className="btn btn-sm btn-outline-secondary mt-2 mt-md-0"
                                    onClick={() => setAttendanceStatus(null)}
                                  >
                                    Change Response
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="alert alert-danger mb-0">
                                <div className="d-flex align-items-center justify-content-between flex-wrap">
                                  <div className="d-flex align-items-center">
                                    <FontAwesomeIcon
                                      icon={faTimesCircle}
                                      className="me-2"
                                      size="lg"
                                    />

                                    <div>
                                      <strong>Attendance Declined</strong>

                                      <p className="mb-0 small">
                                        You have declined this orientation. HR
                                        has been notified.
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    className="btn btn-sm btn-outline-secondary mt-2 mt-md-0"
                                    onClick={() => setAttendanceStatus(null)}
                                  >
                                    Change Response
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Preparation Checklist */}

                      <div className="card border-0 shadow-sm mt-4">
                        <div className="card-body p-4">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="text-primary mb-0">
                              <FontAwesomeIcon
                                icon={faClipboardCheck}
                                className="me-2"
                              />
                              Preparation Checklist
                            </h5>

                            <div className="d-flex align-items-center">
                              <span className="badge bg-light text-dark me-2">
                                {
                                  orientationChecklist.filter(
                                    (item) => item.completed
                                  ).length
                                }{" "}
                                / {orientationChecklist.length} completed
                              </span>

                              <span
                                className={`badge ${
                                  getChecklistProgress() === 100
                                    ? "bg-success"
                                    : getChecklistProgress() >= 50
                                    ? "bg-warning"
                                    : "bg-secondary"
                                }`}
                              >
                                {getChecklistProgress()}%
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar */}

                          <div
                            className="progress mb-4"
                            style={{ height: "8px" }}
                          >
                            <div
                              className={`progress-bar ${
                                getChecklistProgress() === 100
                                  ? "bg-success"
                                  : getChecklistProgress() >= 50
                                  ? "bg-warning"
                                  : "bg-primary"
                              }`}
                              role="progressbar"
                              style={{ width: `${getChecklistProgress()}%` }}
                              aria-valuenow={getChecklistProgress()}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            ></div>
                          </div>

                          {/* Checklist Items */}

                          <div className="checklist-items">
                            {orientationChecklist.map((item) => (
                              <div
                                key={item.id}
                                className={`checklist-item d-flex align-items-center p-3 mb-2 rounded ${
                                  item.completed
                                    ? "checklist-item-completed"
                                    : "checklist-item-pending"
                                }`}
                                onClick={() => handleChecklistToggle(item.id)}
                                style={{
                                  cursor: "pointer",
                                  transition: "all 0.3s ease",
                                }}
                              >
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={item.completed}
                                    onChange={() =>
                                      handleChecklistToggle(item.id)
                                    }
                                    style={{
                                      cursor: "pointer",
                                      width: "20px",
                                      height: "20px",
                                    }}
                                  />
                                </div>

                                <div className="checklist-icon ms-3 me-3">
                                  <FontAwesomeIcon
                                    icon={item.icon}
                                    className={
                                      item.completed
                                        ? "text-success"
                                        : "text-muted"
                                    }
                                  />
                                </div>

                                <div className="flex-grow-1">
                                  <p
                                    className={`mb-0 ${
                                      item.completed
                                        ? "text-decoration-line-through text-muted"
                                        : "fw-medium"
                                    }`}
                                  >
                                    {item.task}
                                  </p>
                                </div>

                                {item.completed && (
                                  <div className="checklist-badge">
                                    <span className="badge bg-success">
                                      <FontAwesomeIcon
                                        icon={faCheckCircle}
                                        className="me-1"
                                      />
                                      Done
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Completion Message */}

                          {getChecklistProgress() === 100 && (
                            <div className="alert alert-success mt-3 mb-0">
                              <div className="d-flex align-items-center">
                                <FontAwesomeIcon
                                  icon={faTrophy}
                                  className="me-2"
                                  size="lg"
                                />

                                <div>
                                  <strong>Great job!</strong> You've completed
                                  all preparation tasks. You're ready for your
                                  orientation!
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="card border-0 shadow-sm">
                      <div className="card-body p-5 text-center">
                        <FontAwesomeIcon
                          icon={faCalendarAlt}
                          className="text-muted mb-3"
                          size="3x"
                        />

                        <h5 className="text-muted mb-2">
                          No Orientation Scheduled
                        </h5>

                        <p className="text-muted mb-0">
                          Your orientation has not been scheduled yet. You will
                          be notified once HR schedules your orientation
                          session.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === "benefits" && (
                <div>
                  <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-4">
                    <div>
                      <h4 className="mb-1">
                        <FontAwesomeIcon
                          icon={faGift}
                          className="me-2 text-primary"
                        />
                        Benefits Overview
                      </h4>
                      <p className="text-muted mb-0">
                        Review the government benefit enrollments you submitted to
                        HR. This read-only snapshot highlights membership numbers,
                        processing status, and any supporting notes.
                      </p>
                    </div>
                    <Badge
                      bg="light"
                      className="rounded-pill text-uppercase fw-semibold small text-dark"
                    >
                      Read-Only Summary
                    </Badge>
                  </div>

                  <div className="row g-4">
                    {benefitsOverviewCards.map((card) => (
                      <div
                        key={card.id}
                        className="col-12 col-md-6 col-xl-3 d-flex"
                      >
                        <div className="card border-0 shadow-sm w-100 h-100">
                          <div className="card-body p-4 d-flex flex-column">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <div className="d-flex align-items-start gap-3">
                                <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary p-3">
                                  <FontAwesomeIcon icon={card.icon} size="lg" />
                                </span>
                                <div>
                                  <h5 className="mb-1 fw-semibold">
                                    {card.title}
                                  </h5>
                                  <div className="text-muted small">
                                    {card.subtitle}
                                  </div>
                                </div>
                              </div>
                              <Badge
                                bg={card.statusVariant}
                                className={`rounded-pill px-3 py-2 text-uppercase small ${
                                  card.isApproved ? "" : "text-dark"
                                }`}
                              >
                                {card.statusLabel}
                              </Badge>
                            </div>

                            <div className="mb-3">
                              <div className="text-uppercase text-muted small fw-semibold">
                                Membership Number
                              </div>
                              <div
                                className={`fs-5 fw-semibold ${
                                  card.hasMembershipNumber
                                    ? "text-dark"
                                    : "text-muted"
                                }`}
                              >
                                {card.membershipNumber}
                              </div>
                            </div>

                            {card.submittedAt && (
                              <div className="d-flex align-items-center text-muted small mb-2">
                                <FontAwesomeIcon
                                  icon={faClock}
                                  className="me-2 text-secondary"
                                />
                                Submitted {card.submittedAt}
                              </div>
                            )}

                            {card.reviewedAt && (
                              <div className="d-flex align-items-center text-muted small mb-2">
                                <FontAwesomeIcon
                                  icon={faCheckCircle}
                                  className="me-2 text-success"
                                />
                                Approved {card.reviewedAt}
                              </div>
                            )}

                            {card.hrRemarks && (
                              <div className="mt-2 p-3 bg-light border rounded small text-muted">
                                <FontAwesomeIcon
                                  icon={faInfoCircle}
                                  className="me-2 text-info"
                                />
                                {card.hrRemarks}
                              </div>
                            )}

                            <div className="mt-auto pt-3 border-top d-flex align-items-center justify-content-between">
                              <span className="text-muted small">
                                Proof of membership
                              </span>
                              {card.proofAvailable ? (
                                <Badge
                                  bg="primary"
                                  className="d-inline-flex align-items-center gap-1"
                                >
                                  <FontAwesomeIcon icon={faFileAlt} />
                                  Uploaded
                                </Badge>
                              ) : (
                                <span className="text-muted small">
                                  Not provided
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "profile" && (
                <div>
                  <h4 className="mb-4">
                    <FontAwesomeIcon
                      icon={faUser}
                      className="me-2 text-primary"
                    />
                    Profile Creation
                  </h4>

                  <div className="card">
                    <div className="card-body">
                      <p className="text-muted">
                        Profile creation interface will be available here.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "documents" && (
                <div>
                  <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-4">
                    <div>
                      <h4 className="mb-1">
                        <FontAwesomeIcon
                          icon={faFileAlt}
                          className="me-2 text-primary"
                        />
                        Dear {applicantName},
                      </h4>

                      <div className="mb-0 text-muted">
                        <div className="alert alert-warning d-flex align-items-start mb-0 py-3 px-3">
                          <FontAwesomeIcon
                            icon={faBell}
                            className="me-2 mt-1 text-warning"
                          />

                          <div>
                            <strong>Reminder:</strong> Please submit all your
                            pre-employment requirements within ten working days
                            from accepting your job offer. Make sure every
                            document is complete and accurate to prevent any
                            delays in finalizing your employment.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-lg-end">
                      {documentsCompleted ? (
                        <div className="d-inline-flex align-items-center text-success fw-semibold submission-countdown-success">
                          <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                          <span>{documentsCompletionMessage}</span>
                          {documentsCompletionAt && (
                            <span className="ms-2 text-muted small">
                              ({formatTimestampForDisplay(documentsCompletionAt)})
                            </span>
                          )}
                        </div>
                      ) : isSubmissionLocked ? (
                        <div className="d-inline-flex align-items-center text-danger fw-semibold submission-countdown-expired">
                          <FontAwesomeIcon icon={faClock} className="me-2" />
                          <span>{submissionLockMessage}</span>
                        </div>
                      ) : (
                        <Badge
                          bg={submissionCountdownVariant}
                          className="rounded-pill px-3 py-2 fw-semibold submission-countdown-badge"
                        >
                          {submissionCountdownLabel}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {!documentsCompleted && isSubmissionLocked && (
                    <Alert variant="danger" className="mb-3">
                      <FontAwesomeIcon icon={faClock} className="me-2" />
                      {submissionLockMessage}
                    </Alert>
                  )}

                  {documentError && (
                    <Alert variant="danger" className="mb-3">
                      {documentError}
                    </Alert>
                  )}

                  {documentLoading && (
                    <div className="mb-3">
                      <OnboardingLoading
                        message="Loading document requirements..."
                        size="small"
                      />
                    </div>
                  )}

                  <Card className="mb-4 border-0 shadow-sm">
                    <Card.Body className="p-4">
                      <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-3">
                        <div>
                          <h6 className="text-uppercase text-muted fw-bold mb-2">
                            Checklist Status
                          </h6>

                          <p className="text-muted mb-0 small">
                            Status updates appear automatically as HR reviews
                            your documents.
                          </p>
                        </div>

                        <div className="d-flex flex-wrap gap-2">
                          {overviewStatusBadges.map((meta) => {
                            const count =
                              documentOverviewMeta.statusCounts?.[meta.key] ??
                              0;

                            return (
                              <Badge
                                key={meta.key}
                                bg={meta.variant}
                                className="px-2 py-1 status-legend-badge"
                              >
                                {meta.label}: {count}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      <div className="text-muted small mb-3">
                        {documentOverviewMeta.lastUpdatedAt
                          ? `Last synced: ${formatTimestampForDisplay(
                              documentOverviewMeta.lastUpdatedAt
                            )}`
                          : "Waiting for first sync..."}
                      </div>

                      <div className="row g-3">
                        {DOCUMENT_SECTIONS.map((section) => (
                          <div
                            key={`${section.id}-status`}
                            className="col-12 col-md-6 col-xl-4"
                          >
                            <div className="status-section-card h-100 p-3 border rounded-3 bg-light bg-opacity-50">
                              <h6 className="fw-semibold text-primary mb-3">
                                {section.title}
                              </h6>

                              <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
                                {section.documents.map((document) => {
                                  const statusKey =
                                    documentStatuses[document.id] ||
                                    "not_submitted";

                                  const statusConfig =
                                    DOCUMENT_STATUS_CONFIG[statusKey] ||
                                    DOCUMENT_STATUS_CONFIG.not_submitted;

                                  const documentData =
                                    documentDataMap[document.id] || null;

                                  const displayStatusLabel =
                                    documentData?.status_label ||
                                    statusConfig.label;

                                  const documentSubmissionWindow =
                                    documentData?.submission_window || null;
                                  const documentFollowUpInfo =
                                    documentData?.follow_up || null;
                                  const documentExtensionActive =
                                    documentSubmissionWindow?.extended || false;
                                  const rawDocumentExtensionDaysRemaining =
                                    typeof documentSubmissionWindow?.days_remaining ===
                                    "number"
                                      ? documentSubmissionWindow.days_remaining
                                      : null;
                                  const documentExtensionDaysRemaining =
                                    rawDocumentExtensionDaysRemaining === null
                                      ? null
                                      : Math.max(
                                          0,
                                          Math.floor(
                                            rawDocumentExtensionDaysRemaining
                                          )
                                        );
                                  const documentExtensionDeadlineDisplay =
                                    documentSubmissionWindow?.extension_deadline
                                      ? formatTimestampForDisplay(
                                          documentSubmissionWindow.extension_deadline
                                        )
                                      : null;
                                  const documentExtensionOriginalDays =
                                    typeof documentSubmissionWindow?.original_total_days ===
                                    "number"
                                      ? Math.floor(
                                          documentSubmissionWindow.original_total_days
                                        )
                                      : null;
                                  const documentExtensionAddedDays =
                                    typeof documentSubmissionWindow?.extension_days_total ===
                                    "number"
                                      ? Math.floor(
                                          documentSubmissionWindow.extension_days_total
                                        )
                                      : null;
                                  const documentExtensionTotalDays =
                                    typeof documentSubmissionWindow?.total_days ===
                                    "number"
                                      ? Math.floor(documentSubmissionWindow.total_days)
                                      : documentExtensionOriginalDays;
                                  const documentExtensionTotalDaysDisplay =
                                    documentExtensionTotalDays ??
                                    documentExtensionOriginalDays ??
                                    submissionTotalDays;
                                  const documentExtensionAddedDaysDisplay =
                                    documentExtensionAddedDays && documentExtensionAddedDays > 0
                                      ? documentExtensionAddedDays
                                      : null;
                                  const documentFollowUpStatus = documentFollowUpInfo?.status
                                    ?.toString()
                                    .toLowerCase();
                                  const followUpPending =
                                    documentFollowUpStatus === "pending";
                                  const followUpRejected =
                                    documentFollowUpStatus === "rejected";
                                  const followUpAccepted =
                                    documentFollowUpStatus === "accepted";

                                  return (
                                    <li
                                      key={`${document.id}-status-item`}
                                      className="d-flex justify-content-between align-items-center status-checklist-item py-2 px-3 bg-white border rounded-3"
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => scrollToDocumentField(document.id)}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                          event.preventDefault();
                                          scrollToDocumentField(document.id);
                                        }
                                      }}
                                    >
                                      <div className="d-flex flex-column pe-3">
                                        <span className="small fw-semibold">
                                        {document.label}
                                      </span>
                                        {documentExtensionActive && (
                                          <span className="text-success small mt-1">
                                            Follow-up approved: window extended to{" "}
                                            {documentExtensionTotalDaysDisplay}{" "}
                                            {documentExtensionTotalDaysDisplay === 1 ? "day" : "days"}
                                            {documentExtensionAddedDaysDisplay
                                              ? ` (+${documentExtensionAddedDaysDisplay} ${
                                                  documentExtensionAddedDaysDisplay === 1 ? "day" : "days"
                                                })`
                                              : "" }
                                            {documentExtensionDaysRemaining !== null
                                              ? ` — ${documentExtensionDaysRemaining} ${
                                                  documentExtensionDaysRemaining === 1 ? "day" : "days"
                                                } remaining`
                                              : ""}
                                            {documentExtensionDeadlineDisplay
                                              ? ` (until ${documentExtensionDeadlineDisplay})`
                                              : ""}
                                          </span>
                                        )}
                                        {!documentExtensionActive &&
                                          followUpAccepted &&
                                          documentExtensionDaysRemaining !== null && (
                                            <span className="text-success small mt-1">
                                              Follow-up approved. {documentExtensionDaysRemaining}{" "}
                                              {documentExtensionDaysRemaining === 1
                                                ? "day"
                                                : "days"}{" "}
                                              remaining
                                              {documentExtensionDeadlineDisplay
                                                ? ` (until ${documentExtensionDeadlineDisplay})`
                                                : ""}
                                            </span>
                                          )}
                                        {!documentExtensionActive &&
                                          !followUpAccepted &&
                                          followUpPending && (
                                          <span className="text-muted small mt-1">
                                            Follow-up request pending HR review
                                          </span>
                                        )}
                                        {!documentExtensionActive &&
                                          !followUpAccepted &&
                                          followUpRejected && (
                                          <span className="text-danger small mt-1">
                                            Follow-up request was not approved
                                          </span>
                                        )}
                                      </div>

                                      <div className="d-flex flex-column align-items-end">
                                      <Badge
                                        bg={statusConfig.variant}
                                        className="status-badge"
                                      >
                                        {displayStatusLabel}
                                      </Badge>
                                        {documentExtensionActive &&
                                          documentExtensionDeadlineDisplay && (
                                            <span className="text-muted small mt-1 text-end">
                                              Until {documentExtensionDeadlineDisplay}
                                            </span>
                                          )}
                                      </div>
                                    </li>
                                  );
                                })}
                                {section.id === "medical-health" &&
                                  additionalRequirements.length > 0 && (
                                    <>
                                      <li className="py-2">
                                        <div className="fw-semibold text-primary">
                                          Additional Requirements
                                        </div>
                                      </li>
                                      {additionalRequirements.map((requirement) => (
                                        <li
                                          key={`${requirement.documentKey}-status-item`}
                                          className="d-flex justify-content-between align-items-center status-checklist-item py-2 px-3 bg-white border rounded-3"
                                          role="button"
                                          tabIndex={0}
                                          onClick={() =>
                                            handleAdditionalRequirementSelection(
                                              requirement.documentKey
                                            )
                                          }
                                          onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                              event.preventDefault();
                                              handleAdditionalRequirementSelection(
                                                requirement.documentKey
                                              );
                                            }
                                          }}
                                          style={{ cursor: "pointer" }}
                                        >
                                          <div className="d-flex flex-column pe-3">
                                            <span className="small fw-semibold">
                                            {requirement.title || "Additional Requirement"}
                                          </span>
                                            {(() => {
                                              const rawRemaining =
                                                typeof requirement.submissionWindow?.days_remaining ===
                                                "number"
                                                  ? requirement.submissionWindow.days_remaining
                                                  : null;
                                              const remainingDisplay =
                                                rawRemaining === null
                                                  ? null
                                                  : Math.max(0, Math.floor(rawRemaining));
                                              const originalDays =
                                                typeof requirement.submissionWindow?.original_total_days ===
                                                "number"
                                                  ? Math.floor(
                                                      requirement.submissionWindow.original_total_days
                                                    )
                                                  : submissionTotalDays;
                                              const extensionAdded =
                                                typeof requirement.submissionWindow?.extension_days_total ===
                                                  "number" &&
                                                requirement.submissionWindow.extension_days_total > 0
                                                  ? Math.floor(
                                                      requirement.submissionWindow.extension_days_total
                                                    )
                                                  : null;
                                              const totalDays =
                                                typeof requirement.submissionWindow?.total_days ===
                                                "number"
                                                  ? Math.floor(requirement.submissionWindow.total_days)
                                                  : originalDays;
                                              const deadlineDisplay = requirement.submissionWindow
                                                ?.extension_deadline
                                                ? formatTimestampForDisplay(
                                                    requirement.submissionWindow.extension_deadline
                                                  )
                                                : null;
                                              const followUpStatus =
                                                requirement.followUp?.status?.toString().toLowerCase() ||
                                                null;

                                              if (requirement.submissionWindow?.extended) {
                                                return (
                                                  <span className="text-success small mt-1">
                                                    Follow-up approved: window extended to {totalDays}{" "}
                                                    {totalDays === 1 ? "day" : "days"}
                                                    {extensionAdded
                                                      ? ` (+${extensionAdded} ${
                                                          extensionAdded === 1 ? "day" : "days"
                                                        })`
                                                      : ""}
                                                    {remainingDisplay !== null
                                                      ? ` — ${remainingDisplay} ${
                                                          remainingDisplay === 1 ? "day" : "days"
                                                        } remaining`
                                                      : ""}
                                                    {deadlineDisplay ? ` (until ${deadlineDisplay})` : ""}
                                                  </span>
                                                );
                                              }

                                              if (followUpStatus === "pending") {
                                                return (
                                                  <span className="text-muted small mt-1">
                                                    Follow-up request pending HR review
                                                  </span>
                                                );
                                              }

                                              if (followUpStatus === "rejected") {
                                                return (
                                                  <span className="text-danger small mt-1">
                                                    Follow-up request was not approved
                                                  </span>
                                                );
                                              }

                                              return null;
                                            })()}
                                          </div>

                                          <div className="d-flex flex-column align-items-end">
                                          <Badge
                                            bg={requirement.statusVariant || "secondary"}
                                            className="status-badge"
                                          >
                                            {requirement.statusLabel || "Pending"}
                                          </Badge>
                                            {requirement.submissionWindow?.extended &&
                                              requirement.submissionWindow?.extension_deadline && (
                                                <span className="text-muted small mt-1 text-end">
                                                  Until{" "}
                                                  {formatTimestampForDisplay(
                                                    requirement.submissionWindow.extension_deadline
                                                  )}
                                                </span>
                                              )}
                                          </div>
                                        </li>
                                      ))}
                                    </>
                                  )}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card.Body>
                  </Card>

                  <Form>
                    {DOCUMENT_SECTIONS.map((section) => (
                      <Card
                        key={section.id}
                        className="mb-4 border-0 shadow-sm"
                      >
                        <Card.Body className="p-4">
                          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3">
                            <div>
                              <h5 className="mb-1 text-primary fw-semibold">
                                {section.title}
                              </h5>

                              <p className="mb-0 text-muted small">
                                {section.description}
                              </p>
                            </div>
                          </div>

                          <div className="row g-3">
                            {section.documents.map((document) => {
                              const statusKey =
                                documentStatuses[document.id] ||
                                "not_submitted";

                              const statusConfig =
                                DOCUMENT_STATUS_CONFIG[statusKey] ||
                                DOCUMENT_STATUS_CONFIG.not_submitted;

                              const documentData =
                                documentDataMap[document.id] || null;

                              const remoteSubmission = documentData?.submission;

                              const documentSubmissionWindow =
                                documentData?.submission_window || null;
                              const documentFollowUpInfo =
                                documentData?.follow_up || null;
                              const documentFollowUpStatus =
                                documentFollowUpInfo?.status?.toString().toLowerCase() ||
                                null;
                              const documentExtensionActive =
                                documentSubmissionWindow?.extended || false;
                              const rawDocumentExtensionDaysRemaining =
                                typeof documentSubmissionWindow?.days_remaining ===
                                "number"
                                  ? documentSubmissionWindow.days_remaining
                                  : null;
                              const documentExtensionDaysRemaining =
                                rawDocumentExtensionDaysRemaining === null
                                  ? null
                                  : Math.max(
                                      0,
                                      Math.floor(rawDocumentExtensionDaysRemaining)
                                    );
                              const documentExtensionDeadlineDisplay =
                                documentSubmissionWindow?.extension_deadline
                                  ? formatTimestampForDisplay(
                                      documentSubmissionWindow.extension_deadline
                                    )
                                  : null;
                              const documentExtensionOriginalDays =
                                typeof documentSubmissionWindow?.original_total_days ===
                                "number"
                                  ? Math.floor(
                                      documentSubmissionWindow.original_total_days
                                    )
                                  : submissionTotalDays;
                              const documentExtensionAddedDays =
                                typeof documentSubmissionWindow?.extension_days_total ===
                                  "number" &&
                                documentSubmissionWindow.extension_days_total > 0
                                  ? Math.floor(
                                      documentSubmissionWindow.extension_days_total
                                    )
                                  : null;
                              const documentExtensionTotalDays =
                                typeof documentSubmissionWindow?.total_days === "number"
                                  ? Math.floor(documentSubmissionWindow.total_days)
                                  : documentExtensionOriginalDays;
                              const documentExtensionTotalDaysDisplay =
                                documentExtensionTotalDays ??
                                documentExtensionOriginalDays ??
                                submissionTotalDays;
                              const documentExtensionAddedDaysDisplay =
                                documentExtensionAddedDays && documentExtensionAddedDays > 0
                                  ? documentExtensionAddedDays
                                  : null;
                              const followUpPending =
                                documentFollowUpStatus === "pending";
                              const followUpRejected =
                                documentFollowUpStatus === "rejected";
                              const followUpAccepted =
                                documentFollowUpStatus === "accepted";

                              const displayStatusLabel =
                                documentData?.status_label ||
                                statusConfig.label;

                              const isUploadingThisDocument =
                                uploadingDocumentKey === document.id;

                              const localFile = documentUploads[document.id];

                              const hasLocalFile = Boolean(localFile);

                              const hasRemoteFile = Boolean(remoteSubmission);

                              const isLockedByBackend =
                                typeof documentData?.lock_uploads === "boolean"
                                  ? documentData.lock_uploads
                                  : null;

                              const isLockedByRemote =
                                isLockedByBackend !== null
                                  ? isLockedByBackend
                                  : hasRemoteFile &&
                                    statusKey !== "resubmission_required";

                              const canUploadFromBackend =
                                typeof documentData?.can_upload === "boolean"
                                  ? documentData.can_upload
                                  : null;

                              const canUploadDocument =
                                canUploadFromBackend !== null
                                  ? canUploadFromBackend
                                  : !isLockedByRemote;

                              const canSubmitDocument =
                                hasLocalFile &&
                                !isUploadingThisDocument &&
                                !isLockedByRemote;

                              const canPreviewDocument =
                                (hasLocalFile || hasRemoteFile) &&
                                !isUploadingThisDocument;

                              const selectButtonClass = `btn btn-outline-primary btn-sm d-inline-flex align-items-center${
                                isUploadingThisDocument ||
                                isLockedByRemote ||
                                !canUploadDocument
                                  ? " disabled opacity-75"
                                  : ""
                              }`;

                              const selectButtonStyle =
                                isUploadingThisDocument ||
                                isLockedByRemote ||
                                !canUploadDocument
                                  ? { pointerEvents: "none" }
                                  : undefined;

                              const remoteFileMetaParts = [];

                              if (remoteSubmission?.file_size) {
                                remoteFileMetaParts.push(
                                  formatFileSize(remoteSubmission.file_size)
                                );
                              }

                              if (remoteSubmission?.file_type) {
                                remoteFileMetaParts.push(
                                  remoteSubmission.file_type
                                );
                              }

                              const remoteFileMeta =
                                remoteFileMetaParts.join(" • ");

                              const governmentIdConfig =
                                GOVERNMENT_ID_FIELD_MAP[document.id] || null;
                              const governmentIdValue = governmentIdConfig
                                ? governmentIdNumbers[document.id] || ""
                                : "";

                              const submittedDisplay =
                                formatTimestampForDisplay(
                                  remoteSubmission?.submitted_at
                                );

                              const reviewedDisplay = formatTimestampForDisplay(
                                remoteSubmission?.reviewed_at
                              );

                              const rejectionReason =
                                remoteSubmission?.rejection_reason;

                              return (
                                <div
                                  key={document.id}
                                  className="col-12"
                                  ref={(node) => setDocumentFieldRef(document.id, node)}
                                >
                                  <div className="p-3 border rounded-3 bg-light bg-opacity-50 document-upload-field">
                                    <div className="d-flex flex-column flex-lg-row gap-3">
                                      <div className="flex-grow-1">
                                        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                          <Badge
                                            bg={statusConfig.variant}
                                            className="status-badge me-1"
                                          >
                                            {displayStatusLabel}
                                          </Badge>

                                          <h6 className="mb-0 fw-semibold">
                                            {document.label}
                                            {document.isRequired && (
                                              <span className="text-danger ms-1">*</span>
                                            )}
                                          </h6>

                                          {!document.isRequired && (
                                            <Badge bg="secondary" className="rounded-pill text-uppercase small">
                                              Optional
                                            </Badge>
                                          )}

                                          <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            className="ms-auto d-inline-flex align-items-center"
                                            onClick={(event) => {
                                              event.preventDefault();
                                              handleOpenFollowUpModal(
                                                document.id
                                              );
                                            }}
                                            disabled={followUpPending}
                                          >
                                            <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                                            {followUpPending
                                              ? "Follow-Up Pending"
                                              : "Request Follow-Up"}
                                          </Button>
                                        </div>

                                        <p className="text-muted small mb-3">
                                          {document.helperText}
                                        </p>

                                        {governmentIdConfig && (
                                          <Form.Group className="mb-3">
                                            <Form.Label className="fw-semibold small text-muted">
                                              {governmentIdConfig.label}
                                            </Form.Label>
                                            <Form.Control
                                              type="text"
                                              placeholder={governmentIdConfig.placeholder}
                                              value={governmentIdValue}
                                              onChange={(event) =>
                                                handleGovernmentIdChange(
                                                  document.id,
                                                  event.target.value
                                                )
                                              }
                                              disabled={
                                                isUploadingThisDocument ||
                                                isLockedByRemote ||
                                                !canUploadDocument
                                              }
                                            />
                                            <Form.Text className="text-muted">
                                              This identifier will be shared with HR for verification.
                                            </Form.Text>
                                          </Form.Group>
                                        )}

                                        {documentFollowUpInfo && (
                                          <Alert
                                            variant={
                                              followUpAccepted
                                                ? "success"
                                                : followUpRejected
                                                ? "danger"
                                                : "info"
                                            }
                                            className="mb-3"
                                          >
                                            <div className="fw-semibold mb-1">
                                              {followUpAccepted
                                                ? "Follow-up Approved"
                                                : followUpRejected
                                                ? "Follow-up Not Approved"
                                                : "Follow-up Pending Review"}
                                            </div>
                                            <div className="small mb-1">
                                              {followUpAccepted
                                                ? `HR granted you additional time to submit this document${
                                                    documentExtensionDeadlineDisplay
                                                      ? ` until ${documentExtensionDeadlineDisplay}`
                                                      : ""
                                                  }.`
                                                : followUpRejected
                                                ? documentFollowUpInfo.hr_response ||
                                                  "Your follow-up request was not approved. Please contact HR for further assistance."
                                                : "HR is currently reviewing your follow-up request."}
                                            </div>
                                            {followUpAccepted &&
                                              documentExtensionDaysRemaining !== null && (
                                                <div className="small text-muted">
                                                  Remaining: {documentExtensionDaysRemaining}{" "}
                                                  {documentExtensionDaysRemaining === 1
                                                    ? "day"
                                                    : "days"}{" "}
                                                  (total window {documentExtensionTotalDaysDisplay}{" "}
                                                  {documentExtensionTotalDaysDisplay === 1
                                                    ? "day"
                                                    : "days"}
                                                  {documentExtensionAddedDaysDisplay
                                                    ? `, +${documentExtensionAddedDaysDisplay} ${
                                                        documentExtensionAddedDaysDisplay === 1
                                                          ? "day"
                                                          : "days"
                                                      } extension`
                                                    : ""}).
                                                </div>
                                              )}
                                            {followUpAccepted &&
                                              documentFollowUpInfo.hr_response && (
                                                <div className="small text-muted mt-1">
                                                  HR note: {documentFollowUpInfo.hr_response}
                                                </div>
                                              )}
                                            {followUpRejected &&
                                              documentFollowUpInfo.hr_response && (
                                                <div className="small text-muted mt-1">
                                                  HR note: {documentFollowUpInfo.hr_response}
                                                </div>
                                              )}
                                          </Alert>
                                        )}

                                        {isLockedByRemote &&
                                          documentData?.upload_lock_reason && (
                                            <div className="alert alert-warning py-2 px-3 mb-3 small">
                                              <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                                              {documentData.upload_lock_reason}
                                            </div>
                                          )}

                                        {hasLocalFile && (
                                          <div className="p-3 bg-white border rounded-3">
                                            <div className="d-flex flex-column flex-md-row align-items-md-center gap-3">
                                              <div className="file-icon-wrapper d-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary">
                                                <FontAwesomeIcon icon={
                                                  localFile.type === "application/pdf"
                                                    ? faFilePdf
                                                    : faFileImage
                                                } />
                                              </div>
                                              <div className="flex-grow-1">
                                                <div className="fw-semibold">
                                                  {localFile.name}
                                                </div>
                                                <div className="text-muted small">
                                                  {formatFileSize(localFile.size)} &nbsp;•&nbsp; {localFile.type || "File"}
                                                </div>
                                              </div>
                                            </div>

                                            {documentPreviews[document.id] &&
                                              localFile?.type?.startsWith("image/") && (
                                                <div className="mt-3">
                                                  <img
                                                    src={documentPreviews[document.id]}
                                                    alt={`${document.label} preview`}
                                                    style={{
                                                      maxWidth: "180px",
                                                      borderRadius: "8px",
                                                      border: "1px solid #dee2e6",
                                                    }}
                                                  />
                                                </div>
                                              )}
                                          </div>
                                        )}

                                        {!hasLocalFile && hasRemoteFile && (
                                          <div className="p-3 bg-white border rounded-3">
                                            <div className="d-flex flex-column flex-md-row align-items-md-center gap-3">
                                              <div className="file-icon-wrapper d-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary">
                                                <FontAwesomeIcon icon={
                                                  remoteSubmission.file_type?.toLowerCase().includes("pdf")
                                                    ? faFilePdf
                                                    : faFileImage
                                                } />
                                              </div>
                                              <div className="flex-grow-1">
                                                <div className="fw-semibold">
                                                  {remoteSubmission.file_name || "Uploaded Document"}
                                                </div>
                                                {remoteFileMeta && (
                                                  <div className="text-muted small">
                                                    {remoteFileMeta}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            {(submittedDisplay || reviewedDisplay) && (
                                              <div className="text-muted small mt-2">
                                                {submittedDisplay && (
                                                  <div>Submitted: {submittedDisplay}</div>
                                                )}
                                                {reviewedDisplay && (
                                                  <div>Reviewed: {reviewedDisplay}</div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-3 mt-3">
                                          <div>
                                            <label
                                              htmlFor={`${document.id}-upload`}
                                              className={selectButtonClass}
                                              style={selectButtonStyle}
                                            >
                                              <FontAwesomeIcon icon={faUpload} className="me-2" />
                                              Select File
                                            </label>
                                            <Form.Control
                                              id={`${document.id}-upload`}
                                              type="file"
                                              accept=".pdf,.jpg,.jpeg,.png"
                                              className="d-none"
                                              disabled={
                                                isUploadingThisDocument ||
                                                isLockedByRemote ||
                                                !canUploadDocument
                                              }
                                              onChange={(event) => {
                                                const input = event.target;
                                                const selectedFile =
                                                  input.files && input.files[0]
                                                    ? input.files[0]
                                                    : null;
                                                handleDocumentChange(document.id, selectedFile);
                                                input.value = "";
                                              }}
                                            />
                                          </div>

                                          <div className="text-muted small">
                                            Upload PDF, JPG, JPEG, or PNG &nbsp;•&nbsp; Max 5 MB
                                          </div>
                                        </div>

                                        <div className="d-flex flex-wrap gap-2 mt-3">
                                          <Button
                                            variant="primary"
                                            size="sm"
                                            type="button"
                                            onClick={(event) => {
                                              event.preventDefault();
                                              handleSubmitDocument(document.id);
                                            }}
                                            disabled={!canSubmitDocument}
                                          >
                                            {isUploadingThisDocument ? (
                                              <>
                                                <span
                                                  className="spinner-border spinner-border-sm me-2"
                                                  role="status"
                                                  aria-hidden="true"
                                                ></span>
                                                Submitting...
                                              </>
                                            ) : (
                                              <>
                                                <FontAwesomeIcon icon={faUpload} className="me-2" />
                                                Submit Document
                                              </>
                                            )}
                                          </Button>

                                          <Button
                                            variant="outline-primary"
                                            size="sm"
                                            type="button"
                                            disabled={!canPreviewDocument}
                                            onClick={(event) => {
                                              event.preventDefault();
                                              if (!canPreviewDocument) return;
                                              handlePreviewDocument(document.id);
                                            }}
                                          >
                                            <FontAwesomeIcon icon={faEye} className="me-2" />
                                            Preview
                                          </Button>

                                          {hasLocalFile && (
                                            <Button
                                              variant="outline-danger"
                                              size="sm"
                                              type="button"
                                              disabled={
                                                isUploadingThisDocument || isLockedByRemote
                                              }
                                              onClick={(event) => {
                                                event.preventDefault();
                                                if (isUploadingThisDocument) return;
                                                handleRemoveDocument(document.id);
                                              }}
                                            >
                                              <FontAwesomeIcon icon={faTimes} className="me-2" />
                                              Remove
                                            </Button>
                                          )}
                                        </div>

                                        {uploadErrors[document.id] && (
                                          <div className="mt-3">
                                            <Alert variant="danger" className="mb-0 py-2 px-3">
                                              {uploadErrors[document.id]}
                                            </Alert>
                                          </div>
                                        )}

                                        {statusKey === "under_review" && (
                                          <Alert variant="info" className="mt-3">
                                            Awaiting HR review. We will notify you once a decision is made.
                                          </Alert>
                                        )}

                                        {statusKey === "approved" && (
                                          <Alert variant="success" className="mt-3">
                                            Document approved by HR. No further action required.
                                          </Alert>
                                        )}

                                        {statusKey === "resubmission_required" && (
                                          <Alert variant="warning" className="mt-3">
                                            <strong>HR Feedback:</strong> {rejectionReason || "Please upload a corrected version of this document."}
                                          </Alert>
                                        )}

                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {section.id === "medical-health" && (
                            <div className="mt-4" ref={additionalRequirementsSectionRef}>
                              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-3">
                                <div>
                                  <h5 className="mb-1 text-primary fw-semibold">
                                    Additional Requirements
                                  </h5>
                                  <p className="mb-0 text-muted small">
                                    Documents requested by HR will appear here for your submission.
                                  </p>
                                </div>
                              </div>

                              {additionalRequirements.length === 0 ? (
                                <div className="p-3 bg-light border rounded-3 text-muted small">
                                  HR hasn't requested any document yet.
                                </div>
                              ) : (
                                <div className="d-flex flex-column gap-3">
                                  {additionalRequirements.map((requirement) => (
                                    <div
                                      key={requirement.documentKey}
                                      className="p-3 border rounded-3 bg-white shadow-sm"
                                    >
                                      <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
                                        <div>
                                          <div className="d-flex align-items-center gap-2 mb-2">
                                            <Badge
                                              bg={requirement.statusVariant}
                                              className="status-badge"
                                            >
                                              {requirement.statusLabel}
                                            </Badge>
                                            <h6 className="mb-0 fw-semibold">
                                              {requirement.title}
                                            </h6>
                                          </div>
                                          {requirement.description && (
                                            <p className="mb-2 text-muted small">
                                              {requirement.description}
                                            </p>
                                          )}
                                          {requirement.submission?.submitted_at && (
                                            <div className="text-muted small">
                                              Submitted: {formatTimestampForDisplay(requirement.submission.submitted_at)}
                                            </div>
                                          )}
                                        </div>
                                        <div className="d-flex flex-column align-items-start align-items-lg-end gap-2">
                                          <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() =>
                                              handleOpenAdditionalRequirementModal(
                                                requirement.documentKey
                                              )
                                            }
                                          >
                                            {requirement.submission ? "View / Update" : "Upload Document"}
                                          </Button>
                                          {requirement.submission && (
                                            <Button
                                              variant="outline-secondary"
                                              size="sm"
                                              onClick={() =>
                                                handlePreviewDocument(
                                                  requirement.documentKey
                                                )
                                              }
                                            >
                                              <FontAwesomeIcon icon={faEye} className="me-2" />
                                              Preview
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                    </div>
                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    ))}
                  </Form>
                </div>
              )}

              {activeTab === "starting-date" && (
                <div>
                  <h4 className="mb-4">
                    <FontAwesomeIcon
                      icon={faCalendarAlt}
                      className="me-2 text-primary"
                    />
                    Starting Date
                  </h4>

                  <div className="card">
                    <div className="card-body">
                      <p className="text-muted">
                        Starting date information will be available here.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Toast Notifications */}

          <OnboardingToast
            show={toast.show}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            onClose={hideToast}
          />

          {/* Additional Requirement Upload Modal */}
          <Modal
            show={showAdditionalRequirementModal}
            onHide={handleCloseAdditionalRequirementModal}
            centered
            size="lg"
          >
            <Form onSubmit={handleAdditionalRequirementSubmit}>
              <Modal.Header closeButton>
                <Modal.Title className="d-flex flex-column w-100">
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <FontAwesomeIcon icon={faFileAlt} className="text-primary" />
                      <span>{activeAdditionalRequirementTitle}</span>
                    </div>
                    <Badge bg={additionalRequirementStatusVariant}>
                      {additionalRequirementStatusLabel}
                    </Badge>
                  </div>
                  {additionalRequirementDescription && (
                    <small className="text-muted mt-2">
                      {additionalRequirementDescription}
                    </small>
                  )}
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {additionalRequirementFollowUp && (
                  <Alert
                    variant={
                      additionalRequirementFollowUpStatus === "accepted"
                        ? "success"
                        : additionalRequirementFollowUpStatus === "rejected"
                        ? "danger"
                        : "info"
                    }
                    className="mb-3"
                  >
                    <div className="fw-semibold mb-1">
                      {additionalRequirementFollowUpStatus === "accepted"
                        ? "Follow-up Approved"
                        : additionalRequirementFollowUpStatus === "rejected"
                        ? "Follow-up Not Approved"
                        : "Follow-up Pending Review"}
                    </div>
                    <div className="small mb-1">
                      {additionalRequirementFollowUpStatus === "accepted"
                        ? `HR granted you additional time to submit this requirement${
                            additionalRequirementExtensionDeadlineDisplay
                              ? ` until ${additionalRequirementExtensionDeadlineDisplay}`
                              : ""
                          }.`
                        : additionalRequirementFollowUpStatus === "rejected"
                        ? additionalRequirementFollowUp.hr_response ||
                          "Your follow-up request was not approved. Please contact HR for further assistance."
                        : "HR is currently reviewing your follow-up request."}
                    </div>
                    {additionalRequirementExtensionActive &&
                      additionalRequirementExtensionDaysRemaining !== null && (
                        <div className="small text-muted">
                          Remaining: {additionalRequirementExtensionDaysRemaining}{" "}
                          {additionalRequirementExtensionDaysRemaining === 1
                            ? "day"
                            : "days"}{" "}
                          (total window {additionalRequirementTotalDaysDisplay}{" "}
                          {additionalRequirementTotalDaysDisplay === 1 ? "day" : "days"}
                          {additionalRequirementExtensionAddedDaysDisplay
                            ? `, +${additionalRequirementExtensionAddedDaysDisplay} ${
                                additionalRequirementExtensionAddedDaysDisplay === 1
                                  ? "day"
                                  : "days"
                              } extension`
                            : ""}).
                        </div>
                      )}
                    {additionalRequirementFollowUp.hr_response &&
                      additionalRequirementFollowUpStatus === "accepted" && (
                        <div className="small text-muted mt-1">
                          HR note: {additionalRequirementFollowUp.hr_response}
                        </div>
                      )}
                  </Alert>
                )}

                {additionalRequirementRemoteSubmission && (
                  <div className="p-3 border rounded bg-light mb-3">
                    <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
                      <div>
                        <div className="fw-semibold">
                          {additionalRequirementRemoteSubmission.file_name ||
                            "Previously Submitted Document"}
                        </div>
                        <div className="text-muted small">
                          Status:{" "}
                          {additionalRequirementRemoteSubmission.status_label ||
                            additionalRequirementStatusLabel}
                        </div>
                        {additionalRequirementRemoteSubmission.submitted_at && (
                          <div className="text-muted small">
                            Submitted:{" "}
                            {formatTimestampForDisplay(
                              additionalRequirementRemoteSubmission.submitted_at
                            )}
                          </div>
                        )}
                        {additionalRequirementRemoteSubmission.reviewed_at && (
                          <div className="text-muted small">
                            Reviewed:{" "}
                            {formatTimestampForDisplay(
                              additionalRequirementRemoteSubmission.reviewed_at
                            )}
                          </div>
                        )}
                        {additionalRequirementRemoteSubmission.rejection_reason && (
                          <div className="text-muted small mt-2">
                            <strong>HR Feedback:</strong>{" "}
                            {additionalRequirementRemoteSubmission.rejection_reason}
                          </div>
                        )}
                        <div className="text-muted small mt-2">
                          Uploading a new file will replace the previous submission.
                        </div>
                      </div>
                      <div className="d-flex align-items-start">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() =>
                            handlePreviewDocument(activeAdditionalRequirementKey)
                          }
                        >
                          <FontAwesomeIcon icon={faEye} className="me-2" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {(additionalRequirementUploadsLocked ||
                  !additionalRequirementCanUpload) &&
                  (additionalRequirementLockReason || !additionalRequirementCanUpload) && (
                    <Alert variant="warning" className="mb-3">
                      <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                      {additionalRequirementLockReason ||
                        "Uploads for this requirement are currently disabled. Please contact HR for assistance."}
                    </Alert>
                  )}

                {additionalRequirementUploadError && (
                  <Alert variant="danger" className="mb-3">
                    {additionalRequirementUploadError}
                  </Alert>
                )}

                <Form.Group controlId="additionalRequirementFile">
                  <Form.Label className="fw-semibold">
                    Upload File
                  </Form.Label>
                  <Form.Control
                    type="file"
                    accept={additionalRequirementFileAccept}
                    onChange={handleAdditionalRequirementFileChange}
                    disabled={
                      additionalRequirementUploading || !additionalRequirementCanUpload
                    }
                  />
                  <Form.Text className="text-muted">
                    Allowed formats: {additionalRequirementFileFormats}. Maximum size:{" "}
                    {additionalRequirementMaxSize}MB.
                  </Form.Text>
                </Form.Group>

                {additionalRequirementLocalFile && (
                  <div className="p-3 border rounded mt-3">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
                      <div>
                        <div className="fw-semibold">
                          {additionalRequirementLocalFile.name}
                        </div>
                        <div className="text-muted small">
                          {formatFileSize(additionalRequirementLocalFile.size)} •{" "}
                          {additionalRequirementLocalFile.type || "File"}
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          type="button"
                          onClick={() =>
                            handlePreviewDocument(activeAdditionalRequirementKey)
                          }
                          disabled={additionalRequirementUploading}
                        >
                          <FontAwesomeIcon icon={faEye} className="me-2" />
                          Preview
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          type="button"
                          onClick={() =>
                            handleRemoveDocument(activeAdditionalRequirementKey)
                          }
                          disabled={additionalRequirementUploading}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    {additionalRequirementLocalPreview &&
                      additionalRequirementLocalFile.type?.startsWith("image/") && (
                        <div className="mt-3">
                          <img
                            src={additionalRequirementLocalPreview}
                            alt="Document preview"
                            style={{
                              maxWidth: "220px",
                              borderRadius: "8px",
                              border: "1px solid #dee2e6",
                            }}
                          />
                        </div>
                      )}
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="outline-secondary"
                  onClick={handleCloseAdditionalRequirementModal}
                  disabled={additionalRequirementUploading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={
                    additionalRequirementUploading ||
                    !additionalRequirementCanUpload ||
                    !additionalRequirementLocalFile
                  }
                >
                  {additionalRequirementUploading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faUpload} className="me-2" />
                      Submit Document
                    </>
                  )}
                </Button>
              </Modal.Footer>
            </Form>
          </Modal>

          {/* Follow-Up Request Modal */}
          <Modal
            show={showFollowUpModal}
            onHide={handleCloseFollowUpModal}
            centered
          >
            <Form onSubmit={handleFollowUpSubmit}>
              <Modal.Header closeButton>
                <Modal.Title>
                  <FontAwesomeIcon icon={faEnvelope} className="me-2 text-primary" />
                  Request Follow-Up
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <p className="text-muted small mb-3">
                  Send a follow-up message to HR regarding{" "}
                  <strong>{followUpDocumentLabel}</strong>. Attach supporting
                  proof if needed.
                </p>

                {followUpError && (
                  <Alert variant="danger" className="py-2">
                    {followUpError}
                  </Alert>
                )}

                <Form.Group controlId="followUpMessage">
                  <Form.Label className="fw-semibold">Message</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    placeholder="Provide additional details or clarification for HR..."
                    value={followUpMessage}
                    onChange={(event) => setFollowUpMessage(event.target.value)}
                    disabled={followUpSubmitting}
                  />
                </Form.Group>

                <Form.Group controlId="followUpAttachment" className="mt-3">
                  <Form.Label className="fw-semibold">Attachment (optional)</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFollowUpAttachmentChange}
                    disabled={followUpSubmitting}
                  />
                  <Form.Text className="text-muted">
                    Max file size 5MB. Accepted formats: PDF, JPG, JPEG, PNG.
                  </Form.Text>
                  {followUpAttachment && (
                    <div className="d-flex align-items-center justify-content-between mt-2 p-2 border rounded bg-light">
                      <span className="small text-truncate">
                        <FontAwesomeIcon icon={faUpload} className="me-2 text-primary" />
                        {followUpAttachment.name}
                      </span>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={handleRemoveFollowUpAttachment}
                        disabled={followUpSubmitting}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </Form.Group>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="outline-secondary"
                  onClick={handleCloseFollowUpModal}
                  disabled={followUpSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={followUpSubmitting || !followUpMessage.trim()}
                >
                  {followUpSubmitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                      Send Follow-Up
                    </>
                  )}
                </Button>
              </Modal.Footer>
            </Form>
          </Modal>

          {/* Decline Offer Confirmation Modal */}

          <Modal
            show={showDeclineModal}
            onHide={() => setShowDeclineModal(false)}
            centered
          >
            <Modal.Header closeButton>
              <Modal.Title>
                <FontAwesomeIcon icon={faTimes} className="me-2 text-danger" />
                Decline Job Offer
              </Modal.Title>
            </Modal.Header>

            <Modal.Body>
              <p>Are you sure you want to decline this job offer?</p>

              <div className="mt-3">
                <label className="form-label small text-muted">
                  May we know why you're declining? (optional)
                </label>

                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Your reason..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                />
              </div>
            </Modal.Body>

            <Modal.Footer>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeclineModal(false)}
              >
                Cancel
              </button>

              <button className="btn btn-danger" onClick={confirmDeclineOffer}>
                <FontAwesomeIcon icon={faTimes} className="me-2" />
                Decline Offer
              </button>
            </Modal.Footer>
          </Modal>

          {/* Application Summary Modal */}

          <Modal
            show={showApplicationModal}
            onHide={() => setShowApplicationModal(false)}
            centered
            size="lg"
          >
            <Modal.Header closeButton>
              <Modal.Title>
                <FontAwesomeIcon
                  icon={faFileAlt}
                  className="me-2 text-primary"
                />
                Application Summary
              </Modal.Title>
            </Modal.Header>

            <Modal.Body>
              <div className="application-summary">
                {loadingApplications ? (
                  <div className="text-center py-5">
                    <div
                      className="spinner-border text-primary mb-3"
                      role="status"
                    >
                      <span className="visually-hidden">Loading...</span>
                    </div>

                    <p className="text-muted">Loading your applications...</p>
                  </div>
                ) : userApplications.length === 0 ? (
                  /* Empty State - No Application */

                  <div className="text-center py-5">
                    <FontAwesomeIcon
                      icon={faFileAlt}
                      className="text-muted mb-3"
                      style={{ fontSize: "4rem" }}
                    />

                    <h5 className="text-muted mb-3">No Application Found</h5>

                    <p className="text-muted mb-4">
                      You haven't submitted any job applications yet. Browse
                      available positions and apply to get started.
                    </p>

                    <div className="d-flex justify-content-center gap-3 mt-4">
                      <button
                        className="btn btn-primary"
                        onClick={() => (window.location.href = "/")}
                      >
                        <FontAwesomeIcon icon={faSearch} className="me-2" />
                        Browse Jobs
                      </button>

                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => setShowApplicationModal(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Show Application Data */

                  <div>
                    {userApplications.map((application, index) => (
                      <div key={application.id || index} className="mb-4">
                        <div className="row">
                          <div className="col-md-6">
                            <table className="table table-borderless">
                              <tbody>
                                <tr>
                                  <td className="fw-bold text-muted">Name:</td>

                                  <td>{application.applicant_name || "N/A"}</td>
                                </tr>

                                <tr>
                                  <td className="fw-bold text-muted">Email:</td>

                                  <td>
                                    {application.applicant_email || "N/A"}
                                  </td>
                                </tr>

                                <tr>
                                  <td className="fw-bold text-muted">
                                    Department:
                                  </td>

                                  <td>{application.department || "N/A"}</td>
                                </tr>

                                <tr>
                                  <td className="fw-bold text-muted">
                                    Position:
                                  </td>

                                  <td>{application.position || "N/A"}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div className="col-md-6">
                            <table className="table table-borderless">
                              <tbody>
                                <tr>
                                  <td className="fw-bold text-muted">
                                    Date Applied:
                                  </td>

                                  <td>
                                    {application.applied_date_ph || "N/A"}
                                  </td>
                                </tr>

                                <tr>
                                  <td className="fw-bold text-muted">
                                    Time Applied:
                                  </td>

                                  <td>
                                    {application.applied_time_ph || "N/A"}
                                  </td>
                                </tr>

                                <tr>
                                  <td className="fw-bold text-muted">
                                    Status:
                                  </td>

                                  <td>
                                    <span
                                      className={`badge ${
                                        application.status === "Pending"
                                          ? "bg-secondary"
                                          : application.status === "Applied"
                                          ? "bg-primary"
                                          : application.status === "ShortListed"
                                          ? "bg-primary"
                                          : application.status === "Interview"
                                          ? "bg-warning"
                                          : application.status === "Offered"
                                          ? "bg-success"
                                          : application.status === "Hired"
                                          ? "bg-success"
                                          : application.status === "Rejected"
                                          ? "bg-danger"
                                          : "bg-secondary"
                                      }`}
                                    >
                                      {application.status || "Pending"}
                                    </span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Modal.Body>

            {userApplications.length > 0 && (
              <Modal.Footer>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowApplicationModal(false)}
                >
                  Close
                </button>
              </Modal.Footer>
            )}
          </Modal>

          <style jsx>{`

        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap');

        

        /* Global font for all text */

        * {

          font-family: 'Noto Sans', sans-serif;

        }

        

        .onboarding-container {

          min-height: 100vh;

          background: white;

          padding: 0;

          overflow-y: auto;

          overflow-x: hidden;

          scroll-behavior: smooth;

        }



        .modern-tab-container {

          background: rgba(248, 249, 250, 0.95);

          backdrop-filter: blur(10px);

          border-radius: 15px;

          padding: 1rem;

          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);

          border: 1px solid rgba(0, 0, 0, 0.1);

        }



        .tab-navigation {

          display: flex;

          align-items: center;

          gap: 0.5rem;

        }



        .modern-tab {

          position: relative;

          background: transparent;

          border: 2px solid transparent;

          border-radius: 12px;

          padding: 0.5rem 1rem;

          min-width: 120px;

          height: 60px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          cursor: pointer;

          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

          font-family: 'Noto Sans', sans-serif;

        }



        .modern-tab:hover {

          background: rgba(74, 144, 226, 0.08);

          border-color: rgba(74, 144, 226, 0.2);

          color: #4a90e2;

          transform: translateY(-3px);

          box-shadow: 0 8px 25px rgba(74, 144, 226, 0.15);

        }



        .modern-tab.active {

          background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);

          border-color: #4a90e2;

          color: white;

          transform: translateY(-3px);

          box-shadow: 0 12px 30px rgba(74, 144, 226, 0.3);

        }



        .modern-tab.active:hover {

          background: linear-gradient(135deg, #3d7bc8 0%, #2d5f9a 100%);

          transform: translateY(-4px);

          box-shadow: 0 16px 35px rgba(74, 144, 226, 0.4);

        }



        .tab-label {

          font-size: 0.9rem;

          font-weight: 600;

          text-align: center;

        }



        .tab-indicator {

          position: absolute;

          bottom: -2px;

          left: 50%;

          transform: translateX(-50%);

          width: 0;

          height: 3px;

          background: linear-gradient(90deg, #4a90e2, #357abd);

          border-radius: 2px;

          transition: width 0.3s ease;

        }



        .modern-tab.active .tab-indicator {

          width: 80%;

        }



        .onboarding-modern-card {

          background: rgba(255, 255, 255, 0.95);

          backdrop-filter: blur(10px);

          border-radius: 20px;

          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);

          border: 1px solid rgba(255, 255, 255, 0.2);

        }



        /* Formal Offer Styles */

        .offer-card {

          border: 1px solid #e9ecef;

          border-radius: 12px;

          box-shadow: 0 2px 10px rgba(0,0,0,0.06);

        }

        .offer-header-title {

          font-weight: 800;

          color: #1f2d3d;

          letter-spacing: 0.2px;

        }

        .offer-title {

          font-weight: 700;

          color: #2c3e50;

        }

        .offer-icon {

          width: 44px;

          height: 44px;

          border-radius: 50%;

          display: flex;

          align-items: center;

          justify-content: center;

          background: #f1f3f5;

          color: #0d6efd;

          border: 1px solid #e9ecef;

        }

        .offer-detail {

          background: #f8f9fa;

          border: 1px solid #e9ecef;

          border-radius: 10px;

          padding: 14px;

          height: 100%;

        }

        .offer-detail .label {

          font-size: 0.75rem;

          color: #6c757d;

          text-transform: uppercase;

          letter-spacing: 0.4px;

          margin-bottom: 4px;

          font-weight: 600;

        }

        .offer-detail .value {

          font-size: 1rem;

          color: #212529;

          font-weight: 600;

        }

        .company-logo {

          width: 48px;

          height: 48px;

          border-radius: 8px;

          overflow: hidden;

          border: 1px solid #e9ecef;

          background: #fff;

          display: flex;

          align-items: center;

          justify-content: center;

        }

        .company-logo img { width: 100%; height: 100%; object-fit: contain; }

        .company-name { font-weight: 700; color: #2c3e50; }



        .onboarding-section-title {

          color: #2c3e50;

          font-weight: 700;

          font-family: 'Noto Sans', sans-serif;

        }



        /* Responsive Design */

        @media (max-width: 1200px) {

          .modern-tab {

            min-width: 110px;

            height: 55px;

            padding: 0.4rem 0.9rem;

          }

          

          .tab-label {

            font-size: 0.8rem;

          }

        }



        @media (max-width: 768px) {

          .modern-tab {

            min-width: 100px;

            height: 50px;

            padding: 0.35rem 0.8rem;

          }

          

          .tab-label {

            font-size: 0.75rem;

          }

        }



        @media (max-width: 576px) {

          .tab-navigation {

            flex-wrap: wrap;

          }

          

          .modern-tab {

            min-width: auto;

            height: 45px;

            flex-direction: row;

            justify-content: center;

            padding: 0.5rem 0.8rem;

          }

        }



        /* Notification Icon Styles */

        .notification-icon {

          position: relative;

          border-radius: 8px;

          padding: 0.5rem 0.75rem;

          transition: all 0.3s ease;

        }



        .notification-icon:hover {

          background-color: rgba(108, 117, 125, 0.1);

          transform: translateY(-2px);

        }



        .notification-badge {

          position: absolute;

          top: -5px;

          right: -5px;

          background: #dc3545;

          color: white;

          border-radius: 50%;

          width: 18px;

          height: 18px;

          font-size: 0.7rem;

          display: flex;

          align-items: center;

          justify-content: center;

          font-weight: 600;

          border: 2px solid white;

        }



        /* Notification Dropdown Styles */

        .notification-container {

          position: relative;

        }



        .notification-dropdown {

          position: absolute;

          top: calc(100% + 8px);

          right: 0;

          width: 360px;

          background: #ffffff;

          border: 1px solid rgba(0,0,0,0.08);

          box-shadow: 0 12px 32px rgba(0,0,0,0.15);

          border-radius: 12px;

          z-index: 1050;

          margin-top: 0;

          animation: slideDown 0.14s ease-out;

        }



        @keyframes slideDown {

          from {

            opacity: 0;

            transform: translateY(-10px);

          }

          to {

            opacity: 1;

            transform: translateY(0);

          }

        }



        .notification-dropdown-header {

          padding: 1rem 1.125rem;

          border-bottom: 1px solid rgba(0, 0, 0, 0.06);

          display: flex;

          justify-content: space-between;

          align-items: center;

          background: rgba(74, 144, 226, 0.02);

          border-radius: 12px 12px 0 0;

        }



        .notification-count-badge {

          background: #dc3545;

          color: white;

          border-radius: 12px;

          padding: 0.25rem 0.5rem;

          font-size: 0.7rem;

          font-weight: 600;

          min-width: 20px;

          text-align: center;

          line-height: 1;

        }



        .notification-dropdown-content {

          max-height: 360px;

          overflow-y: auto;

          scrollbar-width: thin;

          scrollbar-color: rgba(74, 144, 226, 0.3) transparent;

        }

        

        .notification-dropdown-content::-webkit-scrollbar {

          width: 6px;

        }

        

        .notification-dropdown-content::-webkit-scrollbar-track {

          background: transparent;

        }

        

        .notification-dropdown-content::-webkit-scrollbar-thumb {

          background: rgba(74, 144, 226, 0.3);

          border-radius: 3px;

        }

        

        .notification-dropdown-content::-webkit-scrollbar-thumb:hover {

          background: rgba(74, 144, 226, 0.5);

        }



        .notification-dropdown-item {

          padding: 0.875rem;

          border-bottom: 1px solid rgba(0,0,0,0.04);

          transition: all 0.2s ease;

          cursor: pointer;

        }



        .notification-dropdown-item:hover {

          background: rgba(74, 144, 226, 0.04);

        }

        

        .notification-dropdown-item:last-child {

          border-bottom: none;

        }



        .notification-dropdown-item.unread {

          background: rgba(74, 144, 226, 0.03);

        }



        .notification-dropdown-item.unread:hover {

          background: rgba(74, 144, 226, 0.08);

        }

        

        .notification-dot {

          width: 8px;

          height: 8px;

          background: #4a90e2;

          border-radius: 50%;

          flex-shrink: 0;

        }



        .notification-icon-small {

          width: 24px;

          height: 24px;

          border-radius: 50%;

          display: flex;

          align-items: center;

          justify-content: center;

          background: rgba(255, 255, 255, 0.8);

          border: 1px solid rgba(0, 0, 0, 0.1);

          flex-shrink: 0;

        }



        .notification-dropdown-footer {

          padding: 0.625rem;

          border-top: 1px solid rgba(0, 0, 0, 0.06);

          text-align: center;

          background: rgba(0, 0, 0, 0.01);

          border-radius: 0 0 12px 12px;

        }





        /* Message List Styles */

        .messages-list {

          max-height: 600px;

          overflow-y: auto;

        }



        .message-item {

          background: rgba(248, 249, 250, 0.8);

          border: 1px solid rgba(0, 0, 0, 0.05);

          border-radius: 12px;

          padding: 1rem;

          margin-bottom: 1rem;

          transition: all 0.3s ease;

        }



        .message-item:hover {

          background: rgba(248, 249, 250, 1);

          border-color: rgba(0, 123, 255, 0.2);

          transform: translateY(-2px);

          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

        }



        .message-item.selected {

          background: rgba(0, 123, 255, 0.05);

          border-color: rgba(0, 123, 255, 0.3);

        }



        .message-item.unread {

          border-left: 4px solid #007bff;

          background: rgba(0, 123, 255, 0.02);

        }



        .message-item.unread.selected {

          background: rgba(0, 123, 255, 0.08);

        }



        .notification-controls {

          background: rgba(248, 249, 250, 0.8);

          border: 1px solid rgba(0, 0, 0, 0.05);

          border-radius: 12px;

          padding: 1rem;

        }



        .notification-actions {

          display: flex;

          align-items: center;

          gap: 0.5rem;

        }



        /* Timeline Styles */

        .timeline {

          position: relative;

          padding-left: 2rem;

        }



        .timeline::before {

          content: '';

          position: absolute;

          left: 1rem;

          top: 0;

          bottom: 0;

          width: 2px;

          background: #e9ecef;

        }



        .timeline-item {

          position: relative;

          margin-bottom: 1.5rem;

        }



        .timeline-marker {

          position: absolute;

          left: -2rem;

          top: 0.25rem;

          width: 2rem;

          height: 2rem;

          border-radius: 50%;

          background: white;

          border: 2px solid #e9ecef;

          display: flex;

          align-items: center;

          justify-content: center;

          z-index: 1;

        }



        .timeline-item.completed .timeline-marker {

          border-color: #28a745;

          background: #28a745;

        }



        .timeline-item.active .timeline-marker {

          border-color: #ffc107;

          background: #ffc107;

        }



        .timeline-content {

          padding-left: 1rem;

        }



        .message-icon {

          width: 40px;

          height: 40px;

          border-radius: 50%;

          display: flex;

          align-items: center;

          justify-content: center;

          background: rgba(255, 255, 255, 0.8);

          border: 1px solid rgba(0, 0, 0, 0.1);

          flex-shrink: 0;

        }



        /* Notifications Container Styles */

        .notifications-container {

          max-height: 400px;

          overflow-y: auto;

        }



        .notification-item {

          background: rgba(248, 249, 250, 0.8);

          border: 1px solid rgba(0, 0, 0, 0.05);

          border-radius: 12px;

          padding: 1rem;

          margin-bottom: 0.75rem;

          transition: all 0.3s ease;

        }



        .notification-item:hover {

          background: rgba(248, 249, 250, 1);

          border-color: rgba(0, 123, 255, 0.2);

          transform: translateY(-2px);

          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

        }



        .notification-icon-wrapper {

          width: 32px;

          height: 32px;

          border-radius: 50%;

          display: flex;

          align-items: center;

          justify-content: center;

          background: rgba(255, 255, 255, 0.8);

          border: 1px solid rgba(0, 0, 0, 0.1);

        }



        /* Status Display Styles */

        .status-display {

          background: rgba(248, 249, 250, 0.8);

          border-radius: 12px;

          padding: 1.5rem;

          border: 1px solid rgba(0, 0, 0, 0.05);

        }



        .status-icon {

          width: 48px;

          height: 48px;

          border-radius: 50%;

          display: flex;

          align-items: center;

          justify-content: center;

          background: rgba(255, 193, 7, 0.1);

          border: 2px solid #ffc107;

        }



        .status-message {

          background: rgba(248, 249, 250, 0.9);

          border-left: 4px solid #ffc107;

        }



        .next-step {

          background: rgba(13, 202, 240, 0.05);

          border-left: 4px solid #0dcaf0;

        }



        .status-legend {

          font-size: 0.9rem;

        }



        .status-legend .fa-icon {

          width: 16px;

          text-align: center;

        }



        /* Enhanced Timeline Styles */

        .timeline-item.completed .timeline-marker {

          background: #28a745;

          border-color: #28a745;

          color: white;

        }



        .timeline-item.active .timeline-marker {

          background: #ffc107;

          border-color: #ffc107;

          color: white;

          animation: pulse 2s infinite;

        }



        @keyframes pulse {

          0% {

            box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7);

          }

          70% {

            box-shadow: 0 0 0 10px rgba(255, 193, 7, 0);

          }

          100% {

            box-shadow: 0 0 0 0 rgba(255, 193, 7, 0);

          }

        }



        /* Application Summary Modal Styles */

        .application-summary .table td {

          padding: 0.5rem 0.75rem;

          vertical-align: middle;

        }



        .application-summary .table td:first-child {

          width: 40%;

          color: #6c757d;

        }



        .application-summary .table td:last-child {

          font-weight: 500;

        }



        .application-summary .badge {

          font-size: 0.8rem;

          padding: 0.4rem 0.8rem;

        }



        /* Onboarding Sub-Navigation Styles */

        .onboarding-subnav {

          display: flex;

          gap: 0.5rem;

          background: rgba(248, 249, 250, 0.95);

          padding: 0.75rem;

          border-radius: 12px;

          border: 1px solid rgba(0, 0, 0, 0.1);

          flex-wrap: wrap;

        }



        .subnav-item {

          background: white;

          border: 1px solid rgba(0, 0, 0, 0.1);

          border-radius: 8px;

          padding: 0.5rem 1rem;

          font-size: 0.9rem;

          font-weight: 500;

          font-family: 'Noto Sans', sans-serif;

          cursor: pointer;

          transition: all 0.3s ease;

          color: #495057;

        }



        .subnav-item:hover {

          background: rgba(74, 144, 226, 0.08);

          border-color: rgba(74, 144, 226, 0.3);

          color: #4a90e2;

          transform: translateY(-2px);

        }



        .subnav-item.active {

          background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);

          border-color: #4a90e2;

          color: white;

          box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);

        }



        .subnav-item.active:hover {

          background: linear-gradient(135deg, #3d7bc8 0%, #2d5f9a 100%);

          transform: translateY(-2px);

        }



        /* Orientation Info Styles */

        .orientation-info-section {

          position: relative;

        }



        .info-icon-wrapper {

          width: 40px;

          height: 40px;

          display: flex;

          align-items: center;

          justify-content: center;

          background: rgba(248, 249, 250, 0.8);

          border-radius: 10px;

          border: 1px solid rgba(0, 0, 0, 0.05);

          font-size: 1.1rem;

        }



        .info-item {

          transition: all 0.3s ease;

        }



        .info-item:hover {

          transform: translateX(5px);

        }



        .info-item label {

          font-weight: 600;

          text-transform: uppercase;

          letter-spacing: 0.5px;

        }



        /* Checklist Styles */

        .checklist-items {

          max-height: 400px;

          overflow-y: auto;

        }



        .checklist-item {

          background: rgba(248, 249, 250, 0.5);

          border: 1px solid rgba(0, 0, 0, 0.05);

          transition: all 0.3s ease;

        }



        .checklist-item:hover {

          background: rgba(248, 249, 250, 0.9);

          border-color: rgba(74, 144, 226, 0.3);

          transform: translateX(5px);

          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

        }



        .checklist-item-completed {

          background: rgba(40, 167, 69, 0.05);

          border-color: rgba(40, 167, 69, 0.2);

        }



        .checklist-item-completed:hover {

          background: rgba(40, 167, 69, 0.1);

          border-color: rgba(40, 167, 69, 0.3);

        }



        .checklist-item-pending {

          background: rgba(248, 249, 250, 0.5);

          border-color: rgba(0, 0, 0, 0.05);

        }



        .document-upload-field {

          transition: all 0.3s ease;

        }

        .submission-countdown-badge {

          font-size: 0.85rem;

          text-transform: none;

        }

        .submission-countdown-expired {

          font-size: 0.95rem;

        }



        .document-upload-field:hover {

          background: rgba(74, 144, 226, 0.08);

          border-color: rgba(74, 144, 226, 0.3);

          box-shadow: 0 4px 12px rgba(74, 144, 226, 0.15);

        }



        .file-icon-wrapper {

          width: 48px;

          height: 48px;

          font-size: 1.1rem;

        }



        .status-legend-badge {

          font-size: 0.7rem;

          font-weight: 600;

          border-radius: 999px;

          padding: 0.35rem 0.75rem;

        }



        .status-section-card {

          background: rgba(248, 249, 250, 0.65);

          border: 1px solid rgba(0, 0, 0, 0.05);

          transition: all 0.3s ease;

        }



        .status-section-card:hover {

          border-color: rgba(74, 144, 226, 0.2);

          box-shadow: 0 6px 18px rgba(74, 144, 226, 0.15);

        }



        .status-checklist-item {

          transition: all 0.3s ease;

          cursor: pointer;

          user-select: none;

        }



        .status-checklist-item:hover {

          transform: translateX(4px);

          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

          border-color: rgba(74, 144, 226, 0.2);

        }



        .status-badge {

          font-size: 0.7rem;

          letter-spacing: 0.3px;

        }



        .checklist-icon {

          font-size: 1.2rem;

        }



        .checklist-badge {

          animation: fadeIn 0.3s ease;

        }



        @keyframes fadeIn {

          from {

            opacity: 0;

            transform: scale(0.8);

          }

          to {

            opacity: 1;

            transform: scale(1);

          }

        }



        /* Custom Checkbox Styling */

        .checklist-item .form-check-input {

          border-width: 2px;

          border-color: #6c757d;

        }



        .checklist-item .form-check-input:checked {

          background-color: #28a745;

          border-color: #28a745;

        }



        .checklist-item .form-check-input:hover {

          border-color: #4a90e2;

        }



        /* Smooth Animations */

        .modern-tab,

        .tab-indicator {

          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        }



        /* Scrolling Enhancements */

        .main-content {

          scroll-behavior: smooth;

          -webkit-overflow-scrolling: touch;

        }



        .main-content::-webkit-scrollbar {

          width: 8px;

        }



        .main-content::-webkit-scrollbar-track {

          background: #f1f1f1;

          border-radius: 4px;

        }



        .main-content::-webkit-scrollbar-thumb {

          background: #c1c1c1;

          border-radius: 4px;

        }



        .main-content::-webkit-scrollbar-thumb:hover {

          background: #a8a8a8;

        }



        /* Ensure content doesn't get cut off */

        .container-fluid {

          min-height: 100%;

        }



        /* Mobile responsiveness for scrolling */

        @media (max-width: 768px) {

          .main-content {

            height: calc(100vh - 100px);

            padding-bottom: 1rem;

          }

        }

        `}</style>
        </div>
      </div>
    </>
  );
};

export default PersonalOnboarding;

// Interview Tab Styles

const interviewStyles = `

  /* Interview Header Card */

  .interview-header-card {

    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

    border-radius: 12px;

    padding: 1.5rem;

    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);

  }



  /* Loading Container */

  .interview-loading-container {

    background: #f8f9fa;

    border-radius: 12px;

    padding: 2rem;

    border: 1px solid #e9ecef;

  }



  /* Empty State */

  .interview-empty-state {

    background: #f8f9fa;

    border-radius: 12px;

    padding: 3rem 2rem;

    border: 1px solid #e9ecef;

  }



  .interview-empty-icon {

    font-size: 4rem;

    color: #6c757d;

    opacity: 0.5;

  }



  /* Interview Card */

  .interview-card {

    background: #fff;

    border-radius: 12px;

    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);

    overflow: hidden;

    border: 1px solid #e9ecef;

  }



  .interview-card-header {

    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

    padding: 1.5rem;

    color: white;

  }



  .interview-icon-wrapper {

    width: 50px;

    height: 50px;

    background: rgba(255, 255, 255, 0.2);

    border-radius: 50%;

    display: flex;

    align-items: center;

    justify-content: center;

    margin-right: 1rem;

    font-size: 1.2rem;

  }



  .interview-status-badge {

    background: rgba(255, 255, 255, 0.2);

    padding: 0.5rem 1rem;

    border-radius: 20px;

    font-size: 0.875rem;

    font-weight: 500;

  }



  .interview-card-body {

    padding: 2rem;

  }



  /* Interview Details Grid */

  .interview-details-grid {

    display: grid;

    grid-template-columns: 1fr 1fr;

    gap: 2rem;

    margin-bottom: 2rem;

  }



  .interview-detail-section {

    background: #f8f9fa;

    border-radius: 12px;

    padding: 2rem;

    border: 1px solid #e9ecef;

    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  }



  .section-title {

    color: #495057;

    font-weight: 700;

    margin-bottom: 1.5rem;

    font-size: 1.1rem;

    border-bottom: 2px solid #667eea;

    padding-bottom: 0.5rem;

    display: flex;

    align-items: center;

  }



  .detail-items {

    display: flex;

    flex-direction: column;

    gap: 1.5rem;

  }



  .detail-item {

    display: flex;

    align-items: flex-start;

    gap: 1.25rem;

    padding: 1rem;

    background: white;

    border-radius: 8px;

    border: 1px solid #e9ecef;

    transition: all 0.2s ease;

  }



  .detail-item:hover {

    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);

    border-color: #667eea;

  }



  .detail-icon {

    width: 45px;

    height: 45px;

    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

    color: white;

    border-radius: 10px;

    display: flex;

    align-items: center;

    justify-content: center;

    font-size: 1rem;

    flex-shrink: 0;

    box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);

  }



  .detail-content {

    flex: 1;

    min-width: 0;

  }



  .detail-content label {

    display: block;

    font-size: 0.8rem;

    color: #6c757d;

    font-weight: 600;

    margin-bottom: 0.5rem;

    text-transform: uppercase;

    letter-spacing: 0.5px;

    line-height: 1.2;

  }



  .detail-content span {

    display: block;

    font-weight: 700;

    color: #2c3e50;

    font-size: 1rem;

    line-height: 1.4;

    word-wrap: break-word;

  }



  /* Notes Section */

  .interview-notes-section {

    background: #e3f2fd;

    border-left: 4px solid #2196f3;

    border-radius: 8px;

    padding: 1.5rem;

    margin-bottom: 1.5rem;

  }



  .notes-content {

    background: white;

    padding: 1rem;

    border-radius: 6px;

    border: 1px solid #bbdefb;

    color: #495057;

    font-style: italic;

  }



  /* Feedback Section */

  .interview-feedback-section {

    background: #e8f5e8;

    border-left: 4px solid #4caf50;

    border-radius: 8px;

    padding: 1.5rem;

    margin-bottom: 1.5rem;

  }



  .feedback-content {

    background: white;

    padding: 1rem;

    border-radius: 6px;

    border: 1px solid #c8e6c9;

    color: #495057;

  }



  /* Tips Section */

  .interview-tips-section {

    background: #fff3e0;

    border-left: 4px solid #ff9800;

    border-radius: 8px;

    padding: 1.5rem;

  }



  .tips-grid {

    display: grid;

    grid-template-columns: 1fr 1fr;

    gap: 1rem;

    margin-top: 1rem;

  }



  .tip-item {

    display: flex;

    align-items: center;

    gap: 0.75rem;

    padding: 0.75rem;

    background: white;

    border-radius: 6px;

    border: 1px solid #ffcc80;

    font-size: 0.9rem;

    color: #495057;

  }



  .tip-icon {

    color: #4caf50;

    font-size: 0.9rem;

  }



  /* Responsive Design */

  @media (max-width: 768px) {

    .interview-details-grid {

      grid-template-columns: 1fr;

      gap: 1rem;

    }



    .tips-grid {

      grid-template-columns: 1fr;

    }



    .interview-header-card .d-flex {

      flex-direction: column;

      gap: 1rem;

      align-items: flex-start !important;

    }



    .interview-card-header .d-flex {

      flex-direction: column;

      gap: 1rem;

      align-items: flex-start !important;

    }



    .interview-status-badge {

      align-self: flex-start;

    }

  }

`;

// Inject styles into the document

if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");

  styleSheet.textContent = interviewStyles;

  document.head.appendChild(styleSheet);
}