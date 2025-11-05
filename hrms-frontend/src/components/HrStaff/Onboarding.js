import React, { useState, useEffect, useCallback } from "react";

import { Container, Row, Col, Button, Badge, Table } from "react-bootstrap";

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
} from "@fortawesome/free-solid-svg-icons";

import axios from "axios";

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
  });

  const [onboardingSubtab, setOnboardingSubtab] = useState(
    "Orientation Schedule"
  );

  // Batch interview functionality

  const [showBatchInterviewModal, setShowBatchInterviewModal] = useState(false);

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
          return status === "Onboarding";

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

  // Get status badge

  const getStatusBadge = (status) => {
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
        <FontAwesomeIcon icon={config.icon} size="sm" />

        {config.text}
      </Badge>
    );
  };

  // Handle dropdown toggle

  const toggleDropdown = (recordId) => {
    setActiveDropdown(activeDropdown === recordId ? null : recordId);
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
        alert("Interview invite updated successfully! The applicant's existing invite has been updated with new details.");
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
        alert(error?.response?.data?.message || "You don't have permission to schedule interviews. Only HR Staff and HR Assistants can schedule interviews.");
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

      const { successful_count, failed_count, failed_interviews } =
        response.data;

      let message = `Batch interview scheduling completed!\n\n`;

      message += `✅ Successful: ${successful_count} interviews scheduled\n`;

      if (failed_count > 0) {
        message += `❌ Failed: ${failed_count} interviews\n\n`;

        message += `Failed applicants:\n`;

        failed_interviews.forEach((failed) => {
          const applicant = selectedApplicants.find(
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
            {activeTab === "Onboarding" && (
              <div className="mb-3">
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {[
                    "Orientation Schedule",
                    "Employee Documents",
                    "Benefits Enrollment",
                    "Start Date",
                  ].map((tab) => (
                    <Button
                      key={tab}
                      variant={
                        onboardingSubtab === tab
                          ? "primary"
                          : "outline-secondary"
                      }
                      size="sm"
                      onClick={() => setOnboardingSubtab(tab)}
                    >
                      {tab}
                    </Button>
                  ))}
                </div>

                <div className="card">
                  <div className="card-body p-0">
                    {onboardingSubtab === "Orientation Schedule" && (
                      <div
                        className="d-flex justify-content-between align-items-center px-3 py-2"
                        style={{
                          background: "#e9f2ff",
                          borderBottom: "1px solid #dbe7ff",
                        }}
                      >
                        <h6
                          className="mb-0"
                          style={{ color: "#084298", fontWeight: 600 }}
                        >
                          Orientation Schedule
                        </h6>

                        <Button size="sm" variant="primary">
                          + Add Schedule
                        </Button>
                      </div>
                    )}

                    <table className="table mb-0">
                      <thead>
                        {onboardingSubtab === "Orientation Schedule" && (
                          <tr style={{ background: "#f3f8ff" }}>
                            <th>Applicant Name</th>

                            <th>Position</th>

                            <th>Schedule Date</th>

                            <th>Time</th>

                            <th>Location / Link</th>

                            <th>Status</th>
                          </tr>
                        )}

                        {onboardingSubtab === "Employee Documents" && (
                          <>
                            <tr>
                              <th className="px-3" colSpan={5}>
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="fw-semibold">
                                    Employee Documents
                                  </span>

                                  <div className="d-flex gap-2">
                                    <Button size="sm" variant="outline-primary">
                                      Request Document
                                    </Button>

                                    <Button size="sm" variant="primary">
                                      Upload Document
                                    </Button>
                                  </div>
                                </div>
                              </th>
                            </tr>

                            <tr style={{ background: "#f3f8ff" }}>
                              <th>Applicant Name</th>

                              <th>Document Type</th>

                              <th>Status</th>

                              <th>Date Submitted</th>

                              <th>Action</th>
                            </tr>
                          </>
                        )}

                        {onboardingSubtab === "Benefits Enrollment" && (
                          <tr>
                            <th>Employee</th>

                            <th>Plan</th>

                            <th>Enrollment Status</th>

                            <th>Submitted On</th>

                            <th>Actions</th>
                          </tr>
                        )}

                        {onboardingSubtab === "Start Date" && (
                          <tr>
                            <th>Employee</th>

                            <th>Position</th>

                            <th>Department</th>

                            <th>Start Date</th>

                            <th>Status</th>
                          </tr>
                        )}
                      </thead>

                      <tbody>
                        {onboardingSubtab === "Orientation Schedule" &&
                          (() => {
                            const rows = applicants.filter(
                              (a) =>
                                a.status === "Onboarding" ||
                                a.status === "Offer Accepted"
                            );

                            if (rows.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={6} className="text-center py-5">
                                    <div className="d-flex flex-column align-items-center">
                                      <FontAwesomeIcon
                                        icon={faCalendarAlt}
                                        className="text-muted mb-2"
                                        size="2x"
                                      />

                                      <div className="text-muted">
                                        No orientation schedules found
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }

                            return rows.slice(0, 20).map((a) => (
                              <tr
                                key={`ori-${a.id}`}
                                style={{ transition: "background 0.15s ease" }}
                              >
                                <td>
                                  {a.applicant
                                    ? `${a.applicant.first_name || ""} ${
                                        a.applicant.last_name || ""
                                      }`.trim()
                                    : "N/A"}
                                </td>

                                <td>
                                  {a.jobPosting?.position ||
                                    a.job_posting?.position ||
                                    "N/A"}
                                </td>

                                <td>-</td>

                                <td>-</td>

                                <td>-</td>

                                <td>
                                  <span className="badge bg-secondary">
                                    Scheduled
                                  </span>
                                </td>
                              </tr>
                            ));
                          })()}

                        {onboardingSubtab === "Employee Documents" &&
                          (() => {
                            const rows = applicants.filter(
                              (a) =>
                                a.status === "Onboarding" ||
                                a.status === "Offer Accepted"
                            );

                            if (rows.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={5} className="text-center py-5">
                                    <div className="d-flex flex-column align-items-center">
                                      <FontAwesomeIcon
                                        icon={faFileAlt}
                                        className="text-muted mb-2"
                                        size="2x"
                                      />

                                      <div className="text-muted">
                                        No documents found
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }

                            return rows.slice(0, 20).map((a) => (
                              <tr key={`doc-${a.id}`}>
                                <td>
                                  {a.applicant
                                    ? `${a.applicant.first_name || ""} ${
                                        a.applicant.last_name || ""
                                      }`.trim()
                                    : "N/A"}
                                </td>

                                <td>Government ID</td>

                                <td>
                                  <span className="me-2">
                                    <FontAwesomeIcon
                                      icon={faHourglassHalf}
                                      className="text-warning"
                                    />
                                  </span>
                                  Pending
                                </td>

                                <td>-</td>

                                <td>
                                  <Button
                                    size="sm"
                                    variant="outline-primary"
                                    className="me-2"
                                  >
                                    <FontAwesomeIcon
                                      icon={faEye}
                                      className="me-1"
                                    />{" "}
                                    View
                                  </Button>

                                  <Button size="sm" variant="success">
                                    <FontAwesomeIcon
                                      icon={faCheckCircle}
                                      className="me-1"
                                    />{" "}
                                    Verify
                                  </Button>
                                </td>
                              </tr>
                            ));
                          })()}

                        {onboardingSubtab === "Benefits Enrollment" &&
                          applicants

                            .filter(
                              (a) =>
                                a.status === "Onboarding" ||
                                a.status === "Offer Accepted"
                            )

                            .slice(0, 10)

                            .map((a) => (
                              <tr key={`ben-${a.id}`}>
                                <td>
                                  {a.applicant
                                    ? `${a.applicant.first_name || ""} ${
                                        a.applicant.last_name || ""
                                      }`.trim()
                                    : "N/A"}
                                </td>

                                <td>Default</td>

                                <td>Not Enrolled</td>

                                <td>-</td>

                                <td>
                                  <Button variant="outline-primary" size="sm">
                                    View
                                  </Button>
                                </td>
                              </tr>
                            ))}

                        {onboardingSubtab === "Start Date" &&
                          applicants

                            .filter(
                              (a) =>
                                a.status === "Onboarding" ||
                                a.status === "Offer Accepted"
                            )

                            .slice(0, 10)

                            .map((a) => (
                              <tr key={`start-${a.id}`}>
                                <td>
                                  {a.applicant
                                    ? `${a.applicant.first_name || ""} ${
                                        a.applicant.last_name || ""
                                      }`.trim()
                                    : "N/A"}
                                </td>

                                <td>
                                  {a.jobPosting?.position ||
                                    a.job_posting?.position ||
                                    "N/A"}
                                </td>

                                <td>
                                  {a.jobPosting?.department ||
                                    a.job_posting?.department ||
                                    "N/A"}
                                </td>

                                <td>-</td>

                                <td>{a.status}</td>
                              </tr>
                            ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {filteredApplicants.length === 0 ? (
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

                    <span className="text-muted" style={{ fontSize: "0.9rem" }}>
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
                      cursor: activeTab === "Overview" ? "default" : "pointer",

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

                        <div className="applicant-info" style={{ minWidth: 0 }}>
                          <div
                            className="text-muted"
                            style={{ fontSize: "0.75rem", marginBottom: "2px" }}
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
                            style={{ fontSize: "0.75rem", marginBottom: "2px" }}
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
                            style={{ fontSize: "0.75rem", marginBottom: "2px" }}
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
                              {getStatusBadge(applicant.status)}
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

                        {activeTab !== "Overview" &&
                          activeTab !== "Pending" &&
                          activeTab !== "Shortlisted" &&
                          activeTab !== "Interview" &&
                          activeTab !== "Offered" && (
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
                      expandedRowId === applicant.id && (
                        <div
                          className="card-expand mt-2 pt-2"
                          style={{ borderTop: "1px dashed rgba(0,0,0,0.1)" }}
                        >
                          <div className="expanded-content">
                            <div
                              className="expanded-title"
                              style={{ fontSize: "0.85rem", color: "#6c757d" }}
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
                                  style={{ fontWeight: 400, color: "#6c757d" }}
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

              {/* Action Buttons - Only show for Pending status */}

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
    </Container>
  );
};

export default Onboarding;