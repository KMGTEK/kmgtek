'use client';

import { useQuery } from '@tanstack/react-query';
import { FileTextIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import {
  jobApplicationSchema,
  type CandidateProfile,
  type Job,
  type JobApplicationInput,
} from '@kmg/shared';

import {
  applyApiErrorToForm,
  CheckboxField,
  Form,
  SubmitButton,
  TextField,
  useZodForm,
} from '@/components/forms';
import { FileDropzone } from '@/components/shared/file-dropzone';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { useAuth } from '@/lib/auth/auth-provider';
import { formatDate } from '@/lib/utils';

type ResumeMode = 'existing' | 'upload';

/**
 * `consent` must be unchecked initially, but the schema's input type only encodes the
 * "accepted" states (`true | 'true' | 'on'`) — cast the plain object at the call sites below.
 */
const DEFAULT_VALUES = {
  name: '',
  email: '',
  phone: '',
  currentLocation: '',
  currentCompany: '',
  experienceYears: 0,
  currentCtc: '',
  expectedCtc: '',
  noticePeriod: '',
  linkedinUrl: '',
  githubUrl: '',
  portfolioUrl: '',
  consent: false,
};

export function ApplyForm({ job }: { job: Job }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const { data: profile } = useQuery({
    queryKey: qk.me.profile,
    enabled: isAuthenticated,
    queryFn: () => api.getData<CandidateProfile>('/me/profile'),
    retry: false,
  });

  const form = useZodForm(jobApplicationSchema, {
    defaultValues: DEFAULT_VALUES as unknown as JobApplicationInput,
  });

  const [resumeMode, setResumeMode] = React.useState<ResumeMode>('upload');
  const [selectedResumeId, setSelectedResumeId] = React.useState<string | null>(null);
  const [resumeFile, setResumeFile] = React.useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = React.useState<File | null>(null);
  const [resumeError, setResumeError] = React.useState<string | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [progress, setProgress] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const prefilled = React.useRef(false);

  React.useEffect(() => {
    if (!profile || prefilled.current) return;
    prefilled.current = true;
    form.reset({
      ...DEFAULT_VALUES,
      name: profile.name,
      email: profile.email,
      phone: profile.phone ?? '',
      currentLocation: profile.location ?? '',
      currentCompany: profile.currentCompany ?? '',
      experienceYears: profile.experienceYears ?? 0,
      currentCtc: profile.currentCtc ?? '',
      expectedCtc: profile.expectedCtc ?? '',
      noticePeriod: profile.noticePeriod ?? '',
      linkedinUrl: profile.linkedinUrl ?? '',
      githubUrl: profile.githubUrl ?? '',
      portfolioUrl: profile.portfolioUrl ?? '',
    } as unknown as JobApplicationInput);
    const primary = profile.resumes.find((resume) => resume.isPrimary) ?? profile.resumes[0];
    if (primary) {
      setResumeMode('existing');
      setSelectedResumeId(primary.id);
    }
  }, [profile, form]);

  async function onSubmit(values: JobApplicationInput) {
    setResumeError(null);
    if (resumeMode === 'existing' && !selectedResumeId) {
      setResumeError('Select a resume to continue.');
      return;
    }
    if (resumeMode === 'upload' && !resumeFile) {
      setResumeError('Upload your resume to continue.');
      return;
    }
    const missingRequired = job.screeningQuestions.find(
      (question) => question.required && !answers[question.id]?.trim(),
    );
    if (missingRequired) {
      toast.error(`Please answer: “${missingRequired.question}”`);
      return;
    }

    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('email', values.email);
    formData.append('phone', values.phone);
    formData.append('currentLocation', values.currentLocation);
    if (values.currentCompany) formData.append('currentCompany', String(values.currentCompany));
    formData.append('experienceYears', String(values.experienceYears));
    if (values.currentCtc) formData.append('currentCtc', String(values.currentCtc));
    if (values.expectedCtc) formData.append('expectedCtc', String(values.expectedCtc));
    if (values.noticePeriod) formData.append('noticePeriod', String(values.noticePeriod));
    if (values.linkedinUrl) formData.append('linkedinUrl', String(values.linkedinUrl));
    if (values.githubUrl) formData.append('githubUrl', String(values.githubUrl));
    if (values.portfolioUrl) formData.append('portfolioUrl', String(values.portfolioUrl));
    formData.append('source', 'careers-page');
    formData.append('consent', 'true');

    const answerPayload = job.screeningQuestions
      .map((question) => ({ questionId: question.id, answer: answers[question.id] ?? '' }))
      .filter((entry) => entry.answer !== '');
    if (answerPayload.length) formData.append('answers', JSON.stringify(answerPayload));

    if (resumeMode === 'existing' && selectedResumeId) formData.append('resumeId', selectedResumeId);
    if (resumeMode === 'upload' && resumeFile) formData.append('resume', resumeFile);
    if (coverLetterFile) formData.append('coverLetter', coverLetterFile);

    try {
      setSubmitting(true);
      setProgress(0);
      const response = await api.upload<{ data: { applicationId: string; candidateAccountCreated: boolean } }>(
        `/jobs/${job.slug}/apply`,
        formData,
        { onProgress: setProgress },
      );
      router.push(
        `/careers/${job.slug}/apply/success?created=${response.data.candidateAccountCreated ? '1' : '0'}`,
      );
    } catch (error) {
      toast.error(applyApiErrorToForm(error, form));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
        {/* Personal ------------------------------------------------------ */}
        <section className="space-y-5">
          <h2 className="font-display text-lg font-semibold tracking-tight">Personal details</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField name="name" label="Full name" required autoComplete="name" />
            <TextField name="email" label="Email" type="email" required autoComplete="email" />
            <TextField name="phone" label="Phone" type="tel" required autoComplete="tel" />
            <TextField name="currentLocation" label="Current location" required placeholder="City, Country" />
          </div>
        </section>

        {/* Professional --------------------------------------------------- */}
        <section className="space-y-5">
          <h2 className="font-display text-lg font-semibold tracking-tight">Professional details</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField name="currentCompany" label="Current company" />
            <TextField
              name="experienceYears"
              label="Years of experience"
              type="number"
              inputMode="decimal"
              required
            />
            <TextField name="currentCtc" label="Current CTC" placeholder="e.g. $95,000" />
            <TextField name="expectedCtc" label="Expected CTC" placeholder="e.g. $110,000" />
            <TextField name="noticePeriod" label="Notice period" placeholder="e.g. 30 days" />
          </div>
        </section>

        {/* Links ------------------------------------------------------------ */}
        <section className="space-y-5">
          <h2 className="font-display text-lg font-semibold tracking-tight">Links</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            <TextField name="linkedinUrl" label="LinkedIn" placeholder="https://linkedin.com/in/…" />
            <TextField name="githubUrl" label="GitHub" placeholder="https://github.com/…" />
            <TextField name="portfolioUrl" label="Portfolio" placeholder="https://…" />
          </div>
        </section>

        {/* Resume / cover letter --------------------------------------------- */}
        <section className="space-y-5">
          <h2 className="font-display text-lg font-semibold tracking-tight">Resume &amp; cover letter</h2>

          {isAuthenticated && profile && profile.resumes.length > 0 ? (
            <div className="space-y-3">
              <RadioGroup
                value={resumeMode}
                onValueChange={(value) => setResumeMode(value as ResumeMode)}
                className="grid gap-3 sm:grid-cols-2"
              >
                <Label className="flex items-center gap-2 rounded-lg border p-3 text-sm font-normal">
                  <RadioGroupItem value="existing" /> Use a saved resume
                </Label>
                <Label className="flex items-center gap-2 rounded-lg border p-3 text-sm font-normal">
                  <RadioGroupItem value="upload" /> Upload a new resume
                </Label>
              </RadioGroup>

              {resumeMode === 'existing' ? (
                <div className="grid gap-2">
                  {profile.resumes.map((resume) => (
                    <Label
                      key={resume.id}
                      className="hover:border-brand-400 flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-normal"
                    >
                      <input
                        type="radio"
                        name="existing-resume"
                        className="accent-brand-500 size-4"
                        checked={selectedResumeId === resume.id}
                        onChange={() => setSelectedResumeId(resume.id)}
                      />
                      <FileTextIcon className="text-muted-foreground size-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{resume.file.originalName}</span>
                      {resume.isPrimary ? (
                        <span className="text-primary-text dark:text-brand-300 text-xs font-medium">Primary</span>
                      ) : null}
                      <span className="text-muted-foreground text-xs">{formatDate(resume.createdAt)}</span>
                    </Label>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {resumeMode === 'upload' || !(isAuthenticated && profile && profile.resumes.length > 0) ? (
            <FileDropzone
              purpose="RESUME"
              value={resumeFile}
              onChange={setResumeFile}
              label="Resume (required)"
              error={resumeError}
              progress={submitting ? progress : undefined}
            />
          ) : resumeError ? (
            <p role="alert" className="text-destructive text-sm">
              {resumeError}
            </p>
          ) : null}

          <FileDropzone
            purpose="COVER_LETTER"
            value={coverLetterFile}
            onChange={setCoverLetterFile}
            label="Cover letter (optional)"
            progress={submitting ? progress : undefined}
          />
        </section>

        {/* Screening questions ------------------------------------------------ */}
        {job.screeningQuestions.length ? (
          <section className="space-y-5">
            <h2 className="font-display text-lg font-semibold tracking-tight">A few more questions</h2>
            <div className="space-y-5">
              {job.screeningQuestions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <Label>
                    {question.question}
                    {question.required ? <span className="text-destructive"> *</span> : null}
                  </Label>
                  {question.type === 'textarea' ? (
                    <Textarea
                      rows={3}
                      value={answers[question.id] ?? ''}
                      onChange={(event) =>
                        setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))
                      }
                    />
                  ) : question.type === 'yesno' ? (
                    <RadioGroup
                      value={answers[question.id] ?? ''}
                      onValueChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
                      className="flex flex-row gap-6"
                    >
                      <Label className="flex items-center gap-2 text-sm font-normal">
                        <RadioGroupItem value="Yes" /> Yes
                      </Label>
                      <Label className="flex items-center gap-2 text-sm font-normal">
                        <RadioGroupItem value="No" /> No
                      </Label>
                    </RadioGroup>
                  ) : (
                    <input
                      type={question.type === 'number' ? 'number' : 'text'}
                      value={answers[question.id] ?? ''}
                      onChange={(event) =>
                        setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))
                      }
                      className="border-input focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Consent + submit ---------------------------------------------------- */}
        <Card className="gap-4 p-5">
          <CheckboxField
            name="consent"
            label="I consent to KMG Technologies processing my application data for recruitment purposes."
          />
          {submitting && progress > 0 && progress < 100 ? (
            <div className="space-y-1.5">
              <Progress value={progress} />
              <p className="text-muted-foreground text-xs">Uploading… {progress}%</p>
            </div>
          ) : null}
          <SubmitButton size="lg" className="w-full" pendingLabel="Submitting application…">
            Submit application
          </SubmitButton>
        </Card>
      </form>
    </Form>
  );
}
