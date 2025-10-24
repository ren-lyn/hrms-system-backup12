# Manager Leave Overview - Clickable Statistics Cards

## Overview
The three statistics cards on the Manager Leave Overview page are now **interactive and clickable**, displaying detailed information in beautiful modals when clicked.

## 📊 Statistics Cards

### 1. **Pending Requests Card** (Orange)
- **What it shows**: Number of pending leave requests
- **Click action**: Opens a modal with all pending requests in card view
- **Modal features**:
  - List of all pending requests with employee details
  - Department and company information
  - Leave type and duration
  - Date range for each request
  - Status badge

### 2. **Total Days Requested Card** (Blue)
- **What it shows**: Total days requested across all pending requests
- **Click action**: Opens a detailed breakdown modal
- **Modal features**:
  - Summary statistics:
    - Total Days
    - Number of Requests
    - Average Days per Request
  - Requests sorted by duration (highest to lowest)
  - Top 3 requests highlighted with yellow background
  - Visual emphasis on highest day requests

### 3. **Employees Awaiting Card** (Purple)
- **What it shows**: Number of unique employees with pending requests
- **Click action**: Opens employee-focused breakdown
- **Modal features**:
  - List of all employees awaiting response
  - For each employee:
    - Name, department, and company
    - Number of pending requests
    - Total days requested
    - Breakdown of each request with dates
  - Color-coded with purple accents

## 🎨 Modal Design Features

### Visual Design
- **Gradient Headers**: Each modal has a color-coded gradient header matching its card
- **Responsive**: Modals are scrollable with max-height of 500px
- **Color Scheme**:
  - Pending Requests: Orange/Amber gradient (#fff7ed → #fef3c7)
  - Total Days: Blue gradient (#eff6ff → #dbeafe)
  - Employees: Purple gradient (#f5f3ff → #ede9fe)

### User Experience
- **Easy Access**: Single click on any card opens detailed view
- **Clear Navigation**: Close button and modal overlay for easy dismissal
- **Organized Data**: Information presented in clean, scannable cards
- **Visual Hierarchy**: Important data highlighted with larger fonts and colors

## 🎯 Use Cases

### For Managers
1. **Quick Overview**: Click "Pending Requests" to see all requests at a glance
2. **Workload Planning**: Click "Total Days" to identify long leave requests
3. **Employee Management**: Click "Employees Awaiting" to see which employees need attention

### Benefits
- **No Page Navigation**: All details accessible via modals
- **Maintains Context**: Stay on the Leave Overview page
- **Faster Decision Making**: Quickly review request details
- **Better Organization**: Employees grouped with their requests

## 💻 Technical Implementation

### State Management
```javascript
const [showStatsModal, setShowStatsModal] = useState(null); // 'requests', 'days', 'employees'
const [highlightedRequests, setHighlightedRequests] = useState([]);
```

### Click Handlers
```javascript
const handleCardClick = (cardType) => {
  setShowStatsModal(cardType);
  if (cardType === 'employees') {
    setHighlightedRequests(pendingRequests.map(r => r.id));
  }
};
```

### Cards
Each card has an `onClick` handler:
```javascript
<Card onClick={() => handleCardClick('requests')} style={{ cursor: 'pointer', ... }}>
```

### Modals
Three separate modals controlled by `showStatsModal` state:
- `showStatsModal === 'requests'` → Pending Requests Modal
- `showStatsModal === 'days'` → Days Breakdown Modal
- `showStatsModal === 'employees'` → Employees Awaiting Modal

## 📋 Data Processing

### Unique Employees
```javascript
const uniqueEmployees = Array.from(new Set(pendingRequests.map(r => ({
  id: r.employee?.id || r.employee_name,
  name: getEmployeeName(r.employee, r.employee_name),
  department: r.department,
  company: r.company
})).map(JSON.stringify))).map(JSON.parse);
```

### Sorted by Days
```javascript
const requestsByDays = [...pendingRequests].sort((a, b) => 
  (parseInt(b.total_days) || 0) - (parseInt(a.total_days) || 0)
);
```

## 🚀 Usage Instructions

### For Users
1. **Navigate** to Leave Overview page (Leave Request → Leave Overview)
2. **Click** on any of the three statistics cards at the top
3. **View** the detailed breakdown in the modal
4. **Close** the modal by:
   - Clicking the "Close" button
   - Clicking the X in the top-right corner
   - Clicking outside the modal

### Visual Feedback
- Cards have **hover effects** (lift animation)
- **Cursor changes** to pointer on hover
- **Smooth transitions** on all interactions

## 🎨 Color Coding

| Card | Primary Color | Gradient | Icon |
|------|--------------|----------|------|
| Pending Requests | Orange (#f59e0b) | #fff7ed → #fef3c7 | ⏰ Clock |
| Total Days | Blue (#3b82f6) | #eff6ff → #dbeafe | 📅 Calendar |
| Employees Awaiting | Purple (#8b5cf6) | #f5f3ff → #ede9fe | ✅ CheckCircle |

## ✨ Special Features

### Smart Grouping
- Employees modal groups all requests by employee
- Shows total days per employee
- Individual request breakdown per employee

### Visual Emphasis
- Top 3 longest requests highlighted in Days modal
- Color-coded day counts (orange for top 3, blue for others)
- Badge indicators for request counts

### Responsive Design
- Modals scroll on smaller screens
- Cards stack vertically on mobile
- Maintains readability across all devices

## 🔄 Integration

### No Conflicts
- **Does not affect** existing functionality
- **Works alongside** approve/reject actions
- **Independent** of other modals
- **Maintains** all current features

### Performance
- **Efficient** data processing
- **No API calls** (uses existing data)
- **Fast rendering** with React optimizations
- **Smooth animations** with CSS transitions

## 📊 Examples

### Example 1: Checking Pending Requests
1. See "4" on Pending Requests card
2. Click the card
3. View all 4 requests with full details
4. Close modal to return to overview

### Example 2: Planning for Long Absences
1. See "-5" on Total Days card
2. Click the card
3. View requests sorted by duration
4. Identify longest leaves at the top
5. Make informed decisions

### Example 3: Employee Follow-up
1. See "4" on Employees Awaiting card
2. Click the card
3. View which employees have pending requests
4. See how many requests per employee
5. Prioritize responses

## 🎉 Summary

This feature transforms static statistics into **interactive data exploration tools**, allowing managers to quickly drill down into details without leaving the overview page. The beautiful, color-coded modals provide comprehensive information in an organized, user-friendly format.

**Result**: Faster decision-making, better organization, and improved user experience! 🚀

