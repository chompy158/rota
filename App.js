import React, { useState, useEffect, Fragment } from 'react';

// Main App component for the Employee Rota
const App = () => {
    // State for admin authentication
    const [isAdmin, setIsAdmin] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    // State to manage the list of employees
    const [employees] = useState([
        { id: 'emp1', name: 'AH' },
        { id: 'emp2', name: 'AU' },
        { id: 'emp3', name: 'AM' },
        { id: 'emp4', name: 'EH' },
        { id: 'emp5', name: 'AC' },
        { id: 'emp6', name: 'CS' },
        { id: 'emp7', name: 'HSP' },
        { id: 'emp8', name: 'TM' },
        { id: 'emp9', name: 'JH' },
    ]);

    // State to manage the list of shifts
    const [shifts] = useState(['8:00-16:30', '8:30-17:00', '9:00-17:30', '9:30-18:00']);

    // State to manage the days of the week
    const [days] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

    // State to manage the currently selected day for display and editing (only relevant for admin view)
    const [selectedDay, setSelectedDay] = useState(days[0]); // Default to Monday

    // State to store the rota assignments.
    // Structure: { day: { shift: [employeeId1, employeeId2, ...] } }
    const [rota, setRota] = useState({});

    // State to store notes for the rota
    const [notes, setNotes] = useState('');

    // State to store the last updated timestamp
    const [lastUpdated, setLastUpdated] = useState(null);

    // State to track the currently dragged employee's ID
    const [draggedEmployeeId, setDraggedEmployeeId] = useState(null);

    // --- Data Loading and Saving (NOW VIA API) ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/rota'); // Fetch data from your new API endpoint
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setRota(data.rota || {}); // Use empty object if data.rota is null/undefined
                setNotes(data.notes || ''); // Use empty string if data.notes is null/undefined
                setLastUpdated(data.lastUpdated || null); // Use null if data.lastUpdated is null/undefined
            } catch (error) {
                console.error("Error fetching rota data:", error);
                // Optionally: Display a user-friendly error message on the UI
            }
        };

        fetchData();
    }, []); // Empty dependency array means this runs once on component mount

    // Function to save rota and notes (NOW VIA API)
    const saveRotaAndNotes = async (updatedRota, updatedNotes) => {
        const now = new Date().toISOString(); // Generate timestamp at the point of saving
        try {
            const response = await fetch('/api/rota', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rota: updatedRota,
                    notes: updatedNotes,
                    lastUpdated: now // Send the newly generated timestamp to the backend
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // If save is successful, update the frontend's lastUpdated state
            setLastUpdated(now);
            console.log("Rota and notes saved via API!");
        } catch (error) {
            console.error("Error saving rota data via API:", error);
            // Optionally: Display a user-friendly error message on the UI
        }
    };

    // --- Admin Login/Logout Handlers ---
    const handleLogin = (e) => {
        e.preventDefault();
        setLoginError('');
        // Hardcoded admin credentials for local demonstration
        const ADMIN_EMAIL = 'admin@example.com';
        const ADMIN_PASSWORD = 'password123';

        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            setIsAdmin(true);
            setEmail(''); // Clear form
            setPassword(''); // Clear form
            setLoginError('');
        } else {
            setLoginError('Invalid email or password.');
            setIsAdmin(false);
        }
    };

    const handleLogout = () => {
        setIsAdmin(false);
        setLoginError('');
    };

    // Helper to check if an employee is assigned on the currently selected day (for admin view)
    const isEmployeeAssignedOnSelectedDay = (employeeId) => {
        const dayRota = rota[selectedDay];
        if (!dayRota) return false;
        for (const shiftKey of shifts) {
            if (Array.isArray(dayRota[shiftKey]) && dayRota[shiftKey].includes(employeeId)) {
                return true;
            }
        }
        return false;
    };

    // Filtered list of employees available for the selected day (for admin view)
    const availableEmployees = employees.filter(emp => !isEmployeeAssignedOnSelectedDay(emp.id));

    // Helper function to get employee name from ID
    const getEmployeeName = (employeeId) => {
        const employee = employees.find(emp => emp.id === employeeId);
        return employee ? employee.name : 'Unknown';
    };

    // --- Drag and Drop Handlers (Admin Only) ---
    const handleDragStart = (e, employeeId) => {
        if (!isAdmin) return;
        setDraggedEmployeeId(employeeId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        if (!isAdmin) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetShift) => {
        e.preventDefault();
        if (!draggedEmployeeId || !isAdmin) return;

        setRota(prevRota => {
            const newRota = { ...prevRota };

            if (!newRota[selectedDay]) {
                newRota[selectedDay] = {};
            }

            // Remove draggedEmployeeId from any other shift on the *selectedDay*
            for (const shiftKey of shifts) {
                if (newRota[selectedDay][shiftKey] && Array.isArray(newRota[selectedDay][shiftKey])) {
                    newRota[selectedDay][shiftKey] = newRota[selectedDay][shiftKey].filter(
                        (empId) => empId !== draggedEmployeeId
                    );
                    if (newRota[selectedDay][shiftKey].length === 0) {
                        delete newRota[selectedDay][shiftKey];
                    }
                }
            }

            // Add the dragged employee to the target shift on the selected day
            if (!newRota[selectedDay][targetShift]) {
                newRota[selectedDay][targetShift] = [];
            }
            if (!newRota[selectedDay][targetShift].includes(draggedEmployeeId)) {
                newRota[selectedDay][targetShift] = [...newRota[selectedDay][targetShift], draggedEmployeeId];
            }

            // Sort employees alphabetically after adding
            newRota[selectedDay][targetShift].sort((a, b) => {
                const nameA = getEmployeeName(a).toUpperCase();
                const nameB = getEmployeeName(b).toUpperCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            });


            if (Object.keys(newRota[selectedDay]).length === 0) {
                delete newRota[selectedDay];
            }

            // Save the updated rota to the backend
            saveRotaAndNotes(newRota, notes);
            return newRota;
        });

        setDraggedEmployeeId(null);
    };

    // Function to remove a specific employee from a shift slot (Admin Only)
    const handleRemoveEmployee = (shift, employeeIdToRemove) => {
        if (!isAdmin) return;
        setRota(prevRota => {
            const newRota = { ...prevRota };
            if (newRota[selectedDay] && newRota[selectedDay][shift]) {
                newRota[selectedDay][shift] = newRota[selectedDay][shift].filter(
                    (empId) => empId !== employeeIdToRemove
                );

                // Sort employees alphabetically after removal
                newRota[selectedDay][shift].sort((a, b) => {
                    const nameA = getEmployeeName(a).toUpperCase();
                    const nameB = getEmployeeName(b).toUpperCase();
                    if (nameA < nameB) return -1;
                    if (nameA > nameB) return 1;
                    return 0;
                });

                if (newRota[selectedDay][shift].length === 0) {
                    delete newRota[selectedDay][shift];
                }

                if (Object.keys(newRota[selectedDay]).length === 0) {
                    delete newRota[selectedDay];
                }
            }
            // Save the updated rota to the backend
            saveRotaAndNotes(newRota, notes);
            return newRota;
        });
    };

    // Handle notes change and save (Admin Only)
    const handleNotesChange = (e) => {
        if (!isAdmin) return;
        const newNotes = e.target.value;
        setNotes(newNotes);
        // Save the updated notes to the backend
        saveRotaAndNotes(rota, newNotes);
    };

    // Function to clear all assignments for the selected day
    const handleClearDay = () => {
        if (!isAdmin) return;
        setRota(prevRota => {
            const newRota = { ...prevRota };
            if (newRota[selectedDay]) {
                delete newRota[selectedDay]; // Remove all shifts for the selected day
            }
            // Save the updated rota to the backend
            saveRotaAndNotes(newRota, notes);
            return newRota;
        });
    };


    return (
        <div className="min-h-screen bg-gray-900 p-8 font-inter text-gray-100">
            {/* Define custom CSS variables for the purple shades */}
            <style>
                {`
                :root {
                    --purple-base: #c01bcc;
                    --purple-dark: #8d0e99;
                    --purple-darker: #6a0b73;
                    --purple-light: #d140e0;
                    --purple-lighter: #e072ec;
                    --purple-text: #f3e5f5;
                }
                .bg-custom-purple-base { background-color: var(--purple-base); }
                .bg-custom-purple-dark { background-color: var(--purple-dark); }
                .bg-custom-purple-darker { background-color: var(--purple-darker); }
                .bg-custom-purple-light { background-color: var(--purple-light); }
                .bg-custom-purple-lighter { background-color: var(--purple-lighter); }
                .text-custom-purple-text { color: var(--purple-text); }
                .border-custom-purple-dark { border-color: var(--purple-dark); }
                .border-custom-purple-base { border-color: var(--purple-base); }
                .border-custom-purple-light { border-color: var(--purple-light); }
                .focus-ring-custom-purple-light:focus { ring-color: var(--purple-light); }
                .hover-bg-custom-purple-dark:hover { background-color: var(--purple-dark); }
                .hover-border-custom-purple-base:hover { border-color: var(--purple-base); }
                .text-custom-purple-light { color: var(--purple-light); }
                `}
            </style>
            <div id="rota-container" className="max-w-6xl mx-auto bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
                <header className="bg-purple-900 text-white p-6 text-center rounded-t-xl">
                    <h1 className="text-4xl font-extrabold tracking-tight">C&M Shifts</h1>
                    {/* Removed the subtitle as requested */}
                    <div className="mt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
                        {isAdmin ? (
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                            >
                                Logout (Admin)
                            </button>
                        ) : (
                            <form onSubmit={handleLogin} className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="email"
                                    placeholder="Admin Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="p-2 rounded-md bg-gray-700 text-gray-100 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="p-2 rounded-md bg-gray-700 text-gray-100 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <button
                                    type="submit"
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                                >
                                    Admin Login
                                </button>
                            </form>
                        )}
                        {loginError && <p className="text-red-400 text-sm mt-2">{loginError}</p>}
                    </div>
                </header>

                {isAdmin ? (
                    // Admin View: Single Day Rota with Drag & Drop and Notes Editing
                    <div className="flex flex-col lg:flex-row p-8 gap-8">
                        {/* Employee List Section */}
                        <div className="w-full lg:w-1/4 bg-gray-800 p-6 rounded-lg shadow-inner border border-purple-800">
                            <h2 className="text-2xl font-bold text-purple-400 mb-6 border-b-2 border-purple-600 pb-3">Available Employees</h2>
                            <div className="space-y-4">
                                {availableEmployees.map(employee => (
                                    <div
                                        key={employee.id}
                                        draggable={true}
                                        onDragStart={(e) => handleDragStart(e, employee.id)}
                                        className="p-4 rounded-lg shadow-md flex items-center justify-between transition-all duration-200
                                                   bg-purple-800 cursor-grab active:cursor-grabbing hover:scale-105 hover:shadow-lg border border-purple-700 hover:bg-purple-700
                                                   text-gray-100"
                                    >
                                        <span className="font-semibold text-lg">{employee.name}</span>
                                        <img
                                            src="https://ibb.co/gLvd1zM" // Updated image source
                                            alt="Cloud & More Favicon"
                                            className="h-6 w-6"
                                            onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/24x24/c01bcc/ffffff?text=Logo" }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Rota Grid Section (Single Day View) */}
                        <div className="w-full lg:w-3/4 bg-gray-800 p-6 rounded-lg shadow-xl border border-purple-800">
                            <h2 className="text-2xl font-bold text-purple-400 mb-6 border-b-2 border-purple-600 pb-3">
                                Rota for {selectedDay}
                            </h2>

                            {/* Day Selection Buttons */}
                            <div className="flex flex-wrap justify-center gap-2 mb-6">
                                {days.map(day => (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDay(day)}
                                        className={`py-2 px-4 rounded-md font-semibold transition-colors duration-200
                                                    ${selectedDay === day ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                    >
                                        {day}
                                    </button>
                                ))}
                                <button
                                    onClick={handleClearDay}
                                    className="py-2 px-4 rounded-md font-semibold transition-colors duration-200 bg-red-600 text-white hover:bg-red-700 shadow-md"
                                >
                                    Clear Day
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-purple-800">
                                        <tr>
                                            <th className="p-3 text-left text-sm font-medium text-purple-200 uppercase tracking-wider border-b border-purple-700">
                                                Shift
                                            </th>
                                            <th className="p-3 text-center text-sm font-medium text-purple-200 uppercase tracking-wider border-b border-purple-700">
                                                Assigned Employees
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shifts.map(shift => (
                                            <tr key={shift} className="hover:bg-gray-700 transition-colors duration-150">
                                                <td className="p-3 font-semibold text-purple-400 border-b border-gray-700">
                                                    {shift}
                                                </td>
                                                <td
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, shift)}
                                                    className="p-3 border-b border-gray-700 text-center relative
                                                                min-w-[120px] h-24 align-top hover:border-purple-500 hover:bg-gray-600"
                                                >
                                                    <div className={`flex flex-col items-center justify-start h-full p-1
                                                                     rounded-md border-2 border-dashed
                                                                     ${(rota[selectedDay]?.[shift]?.length > 0) ? 'border-[var(--purple-base)] bg-[var(--purple-darker)] assigned-employee-slot-filled' : 'border-purple-700 bg-gray-700 text-gray-300 assigned-employee-slot-empty'}
                                                                     transition-all duration-200`}>
                                                        {rota[selectedDay]?.[shift]?.length > 0 ? (
                                                            rota[selectedDay][shift].map(employeeId => (
                                                                <div key={employeeId}
                                                                    className="font-medium px-3 py-1 rounded-full shadow-sm flex items-center gap-2 mb-1 assigned-employee-bubble"
                                                                    style={{ backgroundColor: 'var(--purple-light)', color: 'var(--purple-text)' }} // Inline styles for employee bubble
                                                                >
                                                                    <span>{getEmployeeName(employeeId)}</span>
                                                                    <button
                                                                        onClick={() => handleRemoveEmployee(shift, employeeId)}
                                                                        className="hover:text-red-300 transition-colors duration-200 text-xl leading-none"
                                                                        style={{ color: 'var(--purple-text)' }} // Inline style for remove button text
                                                                        title="Remove employee"
                                                                    >
                                                                        &times;
                                                                    </button>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span className="text-gray-400 text-sm mt-auto mb-auto">
                                                                Drag employee here
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Notes Section */}
                            <div className="mt-8 p-6 bg-gray-800 rounded-lg shadow-inner border border-purple-800">
                                <h2 className="text-2xl font-bold text-purple-400 mb-4 border-b-2 border-purple-600 pb-3">Notes</h2>
                                <textarea
                                    className="w-full p-3 border border-purple-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-700 text-gray-100"
                                    rows="6"
                                    placeholder="Add any important notes about the rota here..."
                                    value={notes}
                                    onChange={handleNotesChange}
                                    readOnly={false}
                                ></textarea>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Viewer View: Full Week Rota (Read-Only)
                    <div className="p-8">
                        <h2 className="text-2xl font-bold text-purple-400 mb-6 border-b-2 border-purple-600 pb-3 flex justify-between items-center">
                            <span>Weekly Rota Overview</span>
                            {lastUpdated && (
                                <span className="text-sm text-gray-400 font-normal">
                                    Last Updated: {new Intl.DateTimeFormat('en-GB', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short'
                                    }).format(new Date(lastUpdated))}
                                </span>
                            )}
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead className="bg-purple-800">
                                    <tr>
                                        <th className="p-3 text-left text-sm font-medium text-purple-200 uppercase tracking-wider border-b border-purple-700">
                                            Shift / Day
                                        </th>
                                        {days.map(day => (
                                            <th key={day} className="p-3 text-center text-sm font-medium text-purple-200 uppercase tracking-wider border-b border-purple-700">
                                                {day}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {shifts.map(shift => (
                                        <tr key={shift} className="hover:bg-gray-700 transition-colors duration-150">
                                            <td className="p-3 font-semibold text-purple-400 border-b border-gray-700">
                                                {shift}
                                            </td>
                                            {days.map(day => (
                                                <td
                                                    key={`${day}-${shift}`}
                                                    className="p-3 border-b border-gray-700 text-center relative min-w-[120px] h-24 align-top"
                                                >
                                                    <div className={`flex flex-col items-center justify-start h-full p-1
                                                                     rounded-md border-2 border-dashed
                                                                     ${(rota[day]?.[shift]?.length > 0) ? 'border-[var(--purple-base)] bg-[var(--purple-darker)] assigned-employee-slot-filled' : 'border-gray-700 bg-gray-700 text-gray-300 assigned-employee-slot-empty'}`}>
                                                        {rota[day]?.[shift]?.length > 0 ? (
                                                            rota[day][shift].map(employeeId => (
                                                                <div key={employeeId}
                                                                    className="font-medium px-3 py-1 rounded-full shadow-sm flex items-center gap-2 mb-1 assigned-employee-bubble"
                                                                    style={{ backgroundColor: 'var(--purple-light)', color: 'var(--purple-text)' }} // Inline styles for employee bubble
                                                                >
                                                                    <span>{getEmployeeName(employeeId)}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span className="text-gray-400 text-sm mt-auto mb-auto">
                                                                Empty
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Notes Section (Read-Only) */}
                        <div className="mt-8 p-6 bg-gray-800 rounded-lg shadow-inner border border-purple-800">
                            <h2 className="text-2xl font-bold text-purple-400 mb-4 border-b-2 border-purple-600 pb-3">Notes</h2>
                            <textarea
                                className="w-full p-3 border border-purple-700 rounded-md bg-gray-700 text-gray-100"
                                rows="6"
                                value={notes}
                                readOnly={true}
                            ></textarea>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;