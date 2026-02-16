"use client";

import ReCAPTCHA from "react-google-recaptcha";
import { forwardRef } from "react";

interface ReCaptchaProps {
  onChange: (token: string | null) => void;
  onExpired?: () => void;
  onError?: () => void;
}

export const ReCaptcha = forwardRef<ReCAPTCHA, ReCaptchaProps>(
  function ReCaptcha({ onChange, onExpired, onError }, ref) {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    if (!siteKey) {
      console.warn("reCAPTCHA site key not configured");
      return null;
    }

    return (
      <div className="flex justify-center">
        <ReCAPTCHA
          ref={ref}
          sitekey={siteKey}
          onChange={onChange}
          onExpired={onExpired}
          onErrored={onError}
          theme="dark"
          size="normal"
        />
      </div>
    );
  }
);
