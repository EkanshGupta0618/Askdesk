import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import useAuth from "../auth/useAuth";
import AuthLayout from "../components/AuthLayout";
import { Button, FormError, TextField } from "../components/ui";
import { getErrorMessage, getFieldErrors } from "../utils/errors";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ business_name: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setSubmitting(true);
    try {
      await register(form);
      navigate("/overview", { replace: true });
    } catch (err) {
      const fields = getFieldErrors(err);
      if (Object.keys(fields).length) setFieldErrors(fields);
      else setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-ink underline underline-offset-2">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormError message={error} />
        <TextField
          id="business_name"
          label="Business name"
          autoComplete="organization"
          required
          value={form.business_name}
          onChange={update("business_name")}
          error={fieldErrors.business_name}
          hint="Your assistant introduces itself with this name."
        />
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={update("email")}
          error={fieldErrors.email}
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={update("password")}
          error={fieldErrors.password}
          hint="At least 8 characters, not only numbers."
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}