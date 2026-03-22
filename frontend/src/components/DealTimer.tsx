import { useEffect, useState } from 'react';

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface DealTimerProps {
  endTime?: Date;
  onExpire?: () => void;
}

export default function DealTimer({ endTime, onExpire }: DealTimerProps) {
  const [time, setTime] = useState<CountdownTime>({
    days: 3,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!endTime) {
        // Default demo mode - just show 03:00:00:00 format for demo
        return;
      }

      const now = new Date().getTime();
      const target = endTime.getTime();
      const difference = target - now;

      if (difference < 0) {
        setIsExpired(true);
        onExpire?.();
        clearInterval(timer);
        return;
      }

      setTime({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, onExpire]);

  if (isExpired) {
    return <div className="alert alert-warning mb-0">Deal has expired</div>;
  }

  return (
    <div className="flex gap-2 justify-center items-center">
      <div className="text-center">
        <div className="bg-red-700 text-white px-3 py-2 rounded min-w-[50px] text-xl font-bold">
          {String(time.days).padStart(2, '0')}
        </div>
        <small className="text-[0.7rem] text-gray-500 mt-1 block">
          DAYS
        </small>
      </div>
      <span className="text-2xl text-red-700 font-bold">:</span>
      <div className="text-center">
        <div className="bg-red-700 text-white px-3 py-2 rounded min-w-[50px] text-xl font-bold">
          {String(time.hours).padStart(2, '0')}
        </div>
        <small className="text-[0.7rem] text-gray-500 mt-1 block">
          HOURS
        </small>
      </div>
      <span className="text-2xl text-red-700 font-bold">:</span>
      <div className="text-center">
        <div className="bg-red-700 text-white px-3 py-2 rounded min-w-[50px] text-xl font-bold">
          {String(time.minutes).padStart(2, '0')}
        </div>
        <small className="text-[0.7rem] text-gray-500 mt-1 block">
          MINS
        </small>
      </div>
      <span className="text-2xl text-red-700 font-bold">:</span>
      <div className="text-center">
        <div className="bg-red-700 text-white px-3 py-2 rounded min-w-[50px] text-xl font-bold">
          {String(time.seconds).padStart(2, '0')}
        </div>
        <small className="text-[0.7rem] text-gray-500 mt-1 block">
          SECS
        </small>
      </div>
    </div>
  );
}
