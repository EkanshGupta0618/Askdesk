import { Check, Copy } from "lucide-react";
import { useState } from "react";

import useAuth from "../auth/useAuth";
import { Button, PageHeader } from "../components/ui";

export default function SettingsPage() {
  const { user } = useAuth();
  const business = user.business;
  const [copied, setCopied] = useState(false);

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(business.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <PageHeader title="Settings" description="Your business details and the key your chat widget uses." />

      <dl className="divide-y divide-line border-y border-line">
        <div className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr]">
          <dt className="text-sm font-medium text-muted">Business name</dt>
          <dd>{business.name}</dd>
        </div>
        <div className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr]">
          <dt className="text-sm font-medium text-muted">Account email</dt>
          <dd>{user.email}</dd>
        </div>
        <div className="grid gap-2 py-4 sm:grid-cols-[12rem_1fr]">
          <dt className="text-sm font-medium text-muted">API key</dt>
          <dd>
            <div className="flex flex-wrap items-center gap-3">
              <code className="max-w-full overflow-x-auto rounded-md border border-line bg-white px-3 py-2 text-sm">
                {business.api_key}
              </code>
              <Button variant="secondary" onClick={copyKey}>
                {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                {copied ? "Copied" : "Copy key"}
              </Button>
            </div>
            <p className="mt-2 text-sm text-muted">
              Anyone with this key can ask your assistant questions, so only put it in your own website.
            </p>
          </dd>
        </div>
      </dl>
    </>
  );
}