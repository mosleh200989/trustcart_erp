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
    <div className="d-flex gap-2 justify-content-center align-items-center">
      <div className="text-center">
        <div
          style={{
            backgroundColor: '#d32f2f',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            minWidth: '50px',
            fontSize: '1.2rem',
            fontWeight: '700'
          }}
        >
          {String(time.days).padStart(2, '0')}
        </div>
        <small style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px', display: 'block' }}>
          DAYS
        </small>
      </div>
      <span style={{ fontSize: '1.5rem', color: '#d32f2f', fontWeight: 'bold' }}>:</span>
      <div className="text-center">
        <div
          style={{
            backgroundColor: '#d32f2f',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            minWidth: '50px',
            fontSize: '1.2rem',
            fontWeight: '700'
          }}
        >
          {String(time.hours).padStart(2, '0')}
        </div>
        <small style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px', display: 'block' }}>
          HOURS
        </small>
      </div>
      <span style={{ fontSize: '1.5rem', color: '#d32f2f', fontWeight: 'bold' }}>:</span>
      <div className="text-center">
        <div
          style={{
            backgroundColor: '#d32f2f',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            minWidth: '50px',
            fontSize: '1.2rem',
            fontWeight: '700'
          }}
        >
          {String(time.minutes).padStart(2, '0')}
        </div>
        <small style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px', display: 'block' }}>
          MINS
        </small>
      </div>
      <span style={{ fontSize: '1.5rem', color: '#d32f2f', fontWeight: 'bold' }}>:</span>
      <div className="text-center">
        <div
          style={{
            backgroundColor: '#d32f2f',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            minWidth: '50px',
            fontSize: '1.2rem',
            fontWeight: '700'
          }}
        >
          {String(time.seconds).padStart(2, '0')}
        </div>
        <small style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px', display: 'block' }}>
          SECS
        </small>
      </div>
    </div>
  );
}
