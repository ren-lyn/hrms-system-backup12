# Search Debounce Fix - Attendance Dashboard

## Problem
The attendance dashboard was reloading on every keystroke when typing in the search field, causing:
- Poor user experience
- Excessive API calls
- Slow performance
- Unnecessary server load

## Solution
Implemented **debounced search** with a 500ms delay.

### How It Works

1. **User types in search box** → Updates `searchInput` state immediately (UI responsive)
2. **Debounce timer starts** → Waits 500ms
3. **User continues typing** → Timer resets on each keystroke
4. **User stops typing** → After 500ms of inactivity, `searchQuery` updates
5. **API call triggers** → Only when `searchQuery` changes

### Technical Implementation

**Two separate states:**
```javascript
const [searchInput, setSearchInput] = useState('');  // Immediate UI value
const [searchQuery, setSearchQuery] = useState('');  // Debounced API value
```

**Debounce effect:**
```javascript
useEffect(() => {
    const timeoutId = setTimeout(() => {
        setSearchQuery(searchInput);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
}, [searchInput]);
```

**API call only on debounced value:**
```javascript
useEffect(() => {
    fetchAttendanceData();
}, [dateFrom, dateTo, searchQuery, statusFilter]); // Uses searchQuery, not searchInput
```

**Input field uses immediate value:**
```javascript
<Form.Control
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
/>
```

## Benefits

✅ **Better UX** - Smooth typing experience, no lag
✅ **Reduced API calls** - Only searches after user stops typing
✅ **Server efficiency** - Less load on backend
✅ **Faster response** - Input field updates instantly
✅ **Smart searching** - Waits for complete input before searching

## Example Behavior

**Before (without debounce):**
```
User types: "J" → API call
User types: "u" → API call  
User types: "a" → API call
User types: "n" → API call
Total: 4 API calls for "Juan"
```

**After (with debounce):**
```
User types: "J" → No API call
User types: "u" → No API call
User types: "a" → No API call
User types: "n" → No API call
User stops typing → Wait 500ms → 1 API call for "Juan"
Total: 1 API call for "Juan"
```

## Configuration

**Debounce delay:** 500ms (half a second)

To adjust the delay, change the timeout value:
```javascript
setTimeout(() => {
    setSearchQuery(searchInput);
}, 500); // Change this number (in milliseconds)
```

**Recommended values:**
- 300ms - Very responsive, but more API calls
- 500ms - Balanced (current setting)
- 800ms - Fewer API calls, but feels slower

## Files Modified

- `hrms-frontend/src/components/HrAssistant/AttendanceDashboard.js`
  - Added `searchInput` state for immediate UI updates
  - Added debounce `useEffect` hook
  - Updated search input to use `searchInput`
  - Updated reset function to clear both states

## Testing

1. Open Attendance Dashboard
2. Type in the search box: "Juan Dela Cruz"
3. Observe:
   - ✅ Text appears instantly as you type
   - ✅ Loading indicator appears only after you stop typing
   - ✅ Results appear 500ms after last keystroke
   - ✅ No lag or stuttering while typing

## Additional Notes

- Date filters still update immediately (no debounce needed)
- Status filter updates immediately (dropdown selection)
- Reset button clears both `searchInput` and `searchQuery`
- Cleanup function prevents memory leaks by clearing timeout on unmount
