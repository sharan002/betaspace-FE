import React, { useEffect, useState } from 'react';

interface DailyReminderGateProps {
  isAuthenticated: boolean;
}

const DAILY_REMINDER_STORAGE_KEY = 'minmini_message_reminder_ack_date';
const USER_STORAGE_KEY = 'crm_user'; // adjust if different
const FIRST_LOGIN_DATE_STORAGE_KEY_PREFIX = 'crm_first_login_date_';

const getLocalDateKey = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};


const getDeviceType = () => {
  const userAgent = navigator.userAgent.toLowerCase();

  const isMobileUA = /mobile|android|iphone|ipad|ipod/.test(userAgent);
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const smallScreen = window.innerWidth <= 768;

  if (isMobileUA || (isTouchDevice && smallScreen)) {
    return "Mobile";
  }

  return "Laptop/Desktop";
};
const isReminderTimeWindow = (date: Date = new Date()): boolean => {
  const hour = date.getHours();
  // return hour >= 2 && hour < 23;
  return hour >= 0 && hour < 24;
};

const DailyReminderGate: React.FC<DailyReminderGateProps> = ({ isAuthenticated }) => {
  const [isAcknowledged, setIsAcknowledged] = useState(true);
  const [username, setUsername] = useState<string>('');

  // Retrieve username from local storage
  useEffect(() => {
    try {
      const userData = localStorage.getItem(USER_STORAGE_KEY);
      if (userData) {
        const parsed = JSON.parse(userData);
        // Depending on the exact structure, you might need parsed.username or parsed.user?.username
        setUsername(parsed.username || 'User');
      }
    } catch (error) {
      console.error('Failed to parse user data from localStorage', error);
      setUsername('User');
    }
  }, []);

  const getOrCreateFirstLoginDate = (user: string): string => {
    const storageKey = `${FIRST_LOGIN_DATE_STORAGE_KEY_PREFIX}${user}`;
    const existingFirstLoginDate = localStorage.getItem(storageKey);
    if (existingFirstLoginDate) return existingFirstLoginDate;

    const newFirstLoginDate = new Date().toISOString();
    localStorage.setItem(storageKey, newFirstLoginDate);
    return newFirstLoginDate;
  };

  const handleAcknowledge = async () => {
    localStorage.setItem(DAILY_REMINDER_STORAGE_KEY, getLocalDateKey());
    setIsAcknowledged(true);

    if (!isAuthenticated || !username) return;

    const loginData = {
      username,
      loginTime: new Date().toISOString(),
      firstLoginDate: getOrCreateFirstLoginDate(username),
      device: getDeviceType()
    };

    try {
      const res = await fetch('https://ask4people.in/api/login-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await res.json();
      console.log('Login log sent successfully:', data);
    } catch (err) {
      console.error('Failed to send login log:', err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setIsAcknowledged(true);
      return;
    }

    // const evaluateReminderGate = () => {
    //   if (!isReminderTimeWindow()) {
    //     setIsAcknowledged(true);
    //     return;
    //   }

    //   const today = getLocalDateKey();
    //   const acknowledgedDate = localStorage.getItem(DAILY_REMINDER_STORAGE_KEY);
    //   setIsAcknowledged(acknowledgedDate === today);
    // };

    const evaluateReminderGate = () => {
  if (!isReminderTimeWindow()) {
    setIsAcknowledged(true);
    return;
  }

  const today = getLocalDateKey();
  const acknowledgedDate = localStorage.getItem(DAILY_REMINDER_STORAGE_KEY);

  // If no acknowledgement stored → show popup
  if (!acknowledgedDate) {
    setIsAcknowledged(false);
    return;
  }

  // If stored date is today → already acknowledged
  if (acknowledgedDate === today) {
    setIsAcknowledged(true);
  } else {
    // If stored date is old → reset and show again
    localStorage.removeItem(DAILY_REMINDER_STORAGE_KEY);
    setIsAcknowledged(false);
  }
};

    evaluateReminderGate();
    const intervalId = window.setInterval(evaluateReminderGate, 60 * 1000);
    const handleVisibilityChange = () => evaluateReminderGate();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  if (!isAuthenticated || isAcknowledged) return null;

  return (
    <div className="fixed inset-0 z-[20000] bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8 bg-blue-600 text-white text-center">
          <h1 className="text-2xl font-bold">Daily Reminder</h1>
          <p className="text-blue-100 text-sm mt-1">
            Good Morning {username}, Please confirm before opening your dashboard.
          </p>
        </div>
        <div className="p-8 text-center space-y-6">
          <p className="text-lg font-semibold text-slate-800">Whether you have sent a message to Minmini?</p>
          <button
            onClick={handleAcknowledge}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyReminderGate;
