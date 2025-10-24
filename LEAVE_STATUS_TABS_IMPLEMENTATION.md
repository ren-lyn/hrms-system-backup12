# Leave Status - Tabbed Interface Implementation

## Overview
The Leave Status page has been enhanced with a **tabbed interface** that separates Approved and Rejected leave requests into distinct, easy-to-navigate tabs.

## 📑 Features

### **Two Main Tabs**

#### 1. **Approved Requests Tab** (Green)
- **Icon**: ✅ CheckCircle
- **Color Theme**: Green (#10b981)
- **Shows**: All leave requests with status `manager_approved` or `approved`
- **Badge**: Displays count of approved requests

#### 2. **Rejected Requests Tab** (Red)
- **Icon**: ❌ XCircle
- **Color Theme**: Red (#ef4444)
- **Shows**: All leave requests with status `manager_rejected` or `rejected`
- **Badge**: Displays count of rejected requests

## 🎨 Design Features

### Tab Navigation
- **Clean Design**: Modern tab navigation with icons and badges
- **Color-Coded**: 
  - Active Approved tab: Green underline and background tint
  - Active Rejected tab: Red underline and background tint
- **Hover Effects**: Subtle background color change on hover
- **Badges**: Count indicators styled with matching colors
- **Icons**: Visual indicators (CheckCircle for approved, XCircle for rejected)

### Tab Content
- **Consistent Layout**: Both tabs use the same table structure
- **Clean Tables**: Modern, minimalist table design
- **Empty States**: Beautiful empty states when no data
- **Scrollable**: Max height of 500px with smooth scrolling

## 📊 Table Columns

Both tabs display the same columns:
1. **Employee**: Name and department
2. **Type**: Leave type
3. **Dates**: Date range (from - to)
4. **Days**: Number of days (color-coded)
   - Green for approved requests
   - Red for rejected requests
5. **Status**: Status badge with icon

## 🎯 User Experience

### Navigation
1. Click on "Leave Status" in the sidebar
2. Page loads with "Approved Requests" tab active by default
3. Click "Rejected Requests" tab to switch views
4. Tabs maintain clean separation of data

### Visual Feedback
- **Active Tab**: 
  - 3px bottom border in theme color
  - Light background tint
  - Bold, colored text
- **Inactive Tab**:
  - Gray text
  - Transparent background
  - No border

### Empty States
- **Approved Tab** (empty):
  - Large green CheckCircle icon (faded)
  - "No approved requests yet"
  - "Approved requests will appear here"

- **Rejected Tab** (empty):
  - Large red XCircle icon (faded)
  - "No rejected requests yet"
  - "Rejected requests will appear here"

## 💻 Technical Implementation

### Component Structure
```jsx
<Tab.Container defaultActiveKey="approved">
  <Nav variant="tabs">
    <Nav.Item>
      <Nav.Link eventKey="approved" className="tab-link-approved">
        {/* Approved tab content */}
      </Nav.Link>
    </Nav.Item>
    <Nav.Item>
      <Nav.Link eventKey="rejected" className="tab-link-rejected">
        {/* Rejected tab content */}
      </Nav.Link>
    </Nav.Item>
  </Nav>
  
  <Tab.Content>
    <Tab.Pane eventKey="approved">
      {/* Approved requests table */}
    </Tab.Pane>
    <Tab.Pane eventKey="rejected">
      {/* Rejected requests table */}
    </Tab.Pane>
  </Tab.Content>
</Tab.Container>
```

### Data Filtering
```javascript
const approvedRequests = leaveRequests.filter(r => 
  r.status === 'manager_approved' || r.status === 'approved'
);

const rejectedRequests = leaveRequests.filter(r => 
  r.status === 'manager_rejected' || r.status === 'rejected'
);
```

### CSS Classes
```css
.tab-link-approved.active {
  color: #10b981;
  border-bottom-color: #10b981;
  background-color: rgba(16, 185, 129, 0.05);
}

.tab-link-rejected.active {
  color: #ef4444;
  border-bottom-color: #ef4444;
  background-color: rgba(239, 68, 68, 0.05);
}
```

## 📱 Responsive Design

### Desktop (> 768px)
- Full table view with all columns
- Comfortable padding: 14px 16px
- Tab navigation with full labels

### Mobile (≤ 768px)
- Responsive table with adjusted padding
- Smaller font sizes
- Compact tab labels
- Maintained functionality

## 🎨 Color System

### Approved Tab
| Element | Color | Purpose |
|---------|-------|---------|
| Active Tab Text | #10b981 | Primary green |
| Active Tab Border | #10b981 | Bottom border (3px) |
| Active Tab Background | rgba(16, 185, 129, 0.05) | Light green tint |
| Hover Text | #059669 | Darker green |
| Days Count | #10b981 | Green bold text |
| Badge | Green (#10b981) | Count indicator |

### Rejected Tab
| Element | Color | Purpose |
|---------|-------|---------|
| Active Tab Text | #ef4444 | Primary red |
| Active Tab Border | #ef4444 | Bottom border (3px) |
| Active Tab Background | rgba(239, 68, 68, 0.05) | Light red tint |
| Hover Text | #dc2626 | Darker red |
| Days Count | #ef4444 | Red bold text |
| Badge | Red (#ef4444) | Count indicator |

## ✨ Key Benefits

### Organization
- **Clear Separation**: Approved and rejected requests are completely separated
- **Easy Navigation**: Simple tab switching
- **Visual Clarity**: Color coding makes status instantly recognizable

### User Experience
- **Reduced Clutter**: No scrolling through mixed statuses
- **Faster Access**: Direct navigation to desired status
- **Better Focus**: View one category at a time
- **Count Visibility**: Badge shows number of requests at a glance

### Professional Design
- **Modern Interface**: Clean tab navigation
- **Consistent Styling**: Matches existing design system
- **Smooth Transitions**: Polished interactions
- **Accessible**: Clear labels and visual indicators

## 🔄 Default Behavior

- **Default Tab**: "Approved Requests" is active by default
- **State Persistence**: Selection resets when navigating away and back
- **No Page Reload**: Instant tab switching (client-side)

## 📋 Data Display

### Both Tabs Show:
- Employee name (bold, dark text)
- Department (smaller, gray text below name)
- Leave type
- Date range (formatted)
- Number of days (color-coded)
- Status badge (with icon and color)

### Differences:
- **Approved Tab**: Days shown in green
- **Rejected Tab**: Days shown in red
- Different empty states
- Different status badges

## 🎯 Use Cases

### For Managers
1. **Review Approved Requests**: Quickly check all approved leaves
2. **Review Rejected Requests**: See all rejected applications
3. **Compare Counts**: Badge shows totals for each category
4. **Clean View**: Focus on one status at a time

### Benefits
- **Better Organization**: Logical grouping of requests
- **Faster Review**: No mixing of different statuses
- **Clear Overview**: Instant visual feedback
- **Efficient Navigation**: One click to switch views

## 🚀 Implementation Complete

The Leave Status page now provides a **clean, organized, and professional** interface for viewing approved and rejected leave requests, with beautiful color-coded tabs that make navigation intuitive and efficient!

### Features Summary:
✅ Two separate tabs (Approved & Rejected)  
✅ Color-coded design (Green & Red)  
✅ Count badges on tabs  
✅ Icons for visual clarity  
✅ Beautiful empty states  
✅ Responsive design  
✅ Smooth transitions  
✅ Professional styling  

