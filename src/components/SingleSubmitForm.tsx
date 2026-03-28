"use client";

import { useState, type FormHTMLAttributes, type ReactNode } from "react";

type SingleSubmitFormProps = Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  children: ReactNode;
};

export default function SingleSubmitForm({ children, ...props }: SingleSubmitFormProps) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      {...props}
      onSubmit={(event) => {
        if (submitting) {
          event.preventDefault();
          return;
        }
        setSubmitting(true);
        const submitters = event.currentTarget.querySelectorAll<HTMLButtonElement>('button[type="submit"]');
        submitters.forEach((button) => {
          button.disabled = true;
        });
      }}
      data-submitting={submitting ? "true" : "false"}
    >
      {children}
    </form>
  );
}
