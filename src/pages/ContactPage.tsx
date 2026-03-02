import { useEffect, useState } from 'react';
import { ErrorState } from '../components/ui/ErrorState';
import { retryWithTimeout, toErrorMessage } from '../lib/request';
import { formatSupabaseErrorMessage } from '../lib/supabaseErrors';
import { supabase } from '../lib/supabaseClient';
import type { TableRow } from '../types/database';

const fallbackContact: TableRow<'contact_details'> = {
  id: 'fallback-contact',
  email: 'phyouthservice@gmail.com',
  facebook_url: 'https://www.facebook.com/YOUTHSERVICEPHILIPPINES',
  mobile: '09177798413',
  location: 'Philippines Nationwide',
  updated_at: new Date().toISOString(),
};

export const ContactPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contact, setContact] = useState<TableRow<'contact_details'>>(fallbackContact);

  useEffect(() => {
    let isMounted = true;
    let hardStopTimer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      if (!supabase) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }
      const client = supabase;

      setLoading(true);
      hardStopTimer = setTimeout(() => {
        if (isMounted) {
          setLoading(false);
        }
      }, 12000);

      try {
        const { data, error: queryError } = await retryWithTimeout(
          () =>
            client
              .from('contact_details')
              .select('*')
              .order('updated_at', { ascending: false })
              .limit(1),
          {
            attempts: 2,
            timeoutMs: 20000,
            timeoutMessage: 'Request timed out while loading contact details.',
          }
        );

        if (!isMounted) {
          return;
        }

        if (queryError) {
          setError(formatSupabaseErrorMessage(queryError.message));
          setContact(fallbackContact);
          return;
        }

        setContact((data?.[0] as TableRow<'contact_details'> | undefined) ?? fallbackContact);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }
        setError(null);
        setContact(fallbackContact);
        console.warn('Contact details request failed, using fallback values:', toErrorMessage(loadError));
      } finally {
        if (hardStopTimer) {
          clearTimeout(hardStopTimer);
        }
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
      if (hardStopTimer) {
        clearTimeout(hardStopTimer);
      }
    };
  }, []);

  const emailValue = contact.email || 'Not available';
  const phoneValue = contact.mobile || 'Not available';
  const locationValue = contact.location || 'Not available';
  const facebookMainHref = contact.facebook_url || 'https://www.facebook.com/YOUTHSERVICEPHILIPPINES';

  const emailHref =
    emailValue !== 'Not available' && emailValue.includes('@') ? `mailto:${emailValue.trim()}` : null;
  const phoneHref =
    phoneValue !== 'Not available' ? `tel:${phoneValue.replace(/[^+\d]/g, '')}` : null;
  const locationHref =
    locationValue !== 'Not available'
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationValue)}`
      : null;

  return (
    <div className="content-container">
      <section id="contact" className="max-w-6xl mx-auto px-4 md:px-6 mb-8 pb-8 relative">
        <div className="ysp-card p-6 md:p-8">
          <h2
            className="mb-6 text-center md:text-left"
            style={{
              fontFamily: 'var(--font-headings)',
              fontSize: '2.5rem',
              fontWeight: 'var(--font-weight-bold)',
              color: 'rgb(246, 66, 31)',
              letterSpacing: '-0.01em',
            }}
          >
            Get in Touch
          </h2>

          {loading ? (
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Syncing latest contact details...
            </p>
          ) : null}

          {error ? (
            <div className="mb-4">
              <ErrorState message={error} />
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              type="button"
              onClick={() => {
                if (emailHref) {
                  window.location.href = emailHref;
                }
              }}
              className="flex items-center gap-4 p-4 md:p-5 bg-blue-50 border border-blue-100 rounded-xl transition-all duration-250 hover:-translate-y-0.5 hover:shadow-md cursor-pointer active:scale-[0.98] text-left w-full"
            >
              <div className="shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-mail w-6 h-6 text-blue-600"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-gray-900 mb-1" style={{ fontSize: '16px', fontWeight: 500 }}>
                  Email
                </h3>
                <p className="text-sm text-gray-600 break-all">{emailValue}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (phoneHref) {
                  window.location.href = phoneHref;
                }
              }}
              className="flex items-center gap-4 p-4 md:p-5 bg-green-50 border border-green-100 rounded-xl transition-all duration-250 hover:-translate-y-0.5 hover:shadow-md cursor-pointer active:scale-[0.98] text-left w-full"
            >
              <div className="shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-phone w-6 h-6 text-green-600"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-gray-900 mb-1" style={{ fontSize: '16px', fontWeight: 500 }}>
                  Phone
                </h3>
                <p className="text-sm text-gray-600">{phoneValue}</p>
              </div>
            </button>

            <a
              href={locationHref ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 md:p-5 bg-orange-50 border border-orange-100 rounded-xl transition-all duration-250 hover:-translate-y-0.5 hover:shadow-md cursor-pointer active:scale-[0.98]"
              onClick={(event) => {
                if (!locationHref) {
                  event.preventDefault();
                }
              }}
            >
              <div className="shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-map-pin w-6 h-6 text-orange-600"
                >
                  <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-gray-900 mb-1" style={{ fontSize: '16px', fontWeight: 500 }}>
                  Location
                </h3>
                <p className="text-sm text-gray-600">{locationValue}</p>
              </div>
            </a>

            <a
              href={facebookMainHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 md:p-5 bg-blue-50 border border-blue-100 rounded-xl transition-all duration-250 hover:-translate-y-0.5 hover:shadow-md cursor-pointer active:scale-[0.98]"
            >
              <div className="shrink-0" style={{ color: 'rgb(24, 119, 242)' }}>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-gray-900 mb-1" style={{ fontSize: '16px', fontWeight: 500 }}>
                  Facebook
                </h3>
                <p className="text-sm text-gray-600 truncate">Youth Service Philippines</p>
              </div>
            </a>
          </div>

          <div className="mt-8 p-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-2xl text-center">
            <h3
              className="mb-3"
              style={{
                fontFamily: 'var(--font-headings)',
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'rgb(246, 66, 31)',
              }}
            >

              Become Our Partner
            </h3>
            <p className="text-sm text-gray-800 mb-4 max-w-xl mx-auto" style={{ fontWeight: 500 }}>
              Join us in making a difference in our community. Partner with YSP and help us create
              lasting impact through collaborative projects.
            </p>
            <button
              type="button"
              onClick={() => window.open('https://www.facebook.com/YOUTHSERVICEPHILIPPINES', '_blank', 'noopener,noreferrer')}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:scale-105"
              style={{
                background:
                  'linear-gradient(135deg, rgb(246, 66, 31) 0%, rgb(238, 135, 36) 50%, rgb(251, 203, 41) 100%)',
                fontFamily: 'var(--font-headings)',
                fontWeight: 600,
                fontSize: '1.125rem',
                boxShadow: '0 4px 16px rgba(246, 66, 31, 0.4)',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-mail w-5 h-5"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              Partner with Us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
