export interface LoanApplication {
  id: string
  applicantType?: string
  cnicStatus?: string
  maritalStatus?: string
  gender?: string
  employmentStatus?: string
  monthlyIncomeRange?: string
  purposeOfFinancing?: string
  propertyType?: string
  propertyStatus?: string
  propertyOwnership?: string
  propertySize?: string
  requiredLoanAmount?: string
  requiredLoanAmountCustom?: string
  preferredLoanTenure?: string
  currentHomeOwnership?: string
  preferredBank?: string
  city?: string
  fullName: string
  fatherOrHusbandName?: string
  cnicNumber?: string
  dateOfBirth?: string
  mobileNumber: string
  email?: string
  currentAddress?: string
  permanentAddress?: string
  province?: string
  monthlyGrossIncome?: string
  monthlyNetIncome?: string
  existingMonthlyLoanInstallments?: string
  monthlyRent?: string
  otherIncome?: string
  employmentOrBusinessName?: string
  yearsInEmploymentOrBusiness?: string
  status: string
  createdAt?: string
  updatedAt?: string
}

export const LOAN_STATUS_OPTIONS = [
  { label: 'New', value: 'new' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Closed', value: 'closed' },
] as const

export function loanAmountLabel(row: Pick<LoanApplication, 'requiredLoanAmount' | 'requiredLoanAmountCustom'>): string {
  const custom = row.requiredLoanAmountCustom?.trim()
  if (custom) return custom
  return row.requiredLoanAmount?.trim() || '—'
}

export function displayValue(value?: string | null): string {
  const trimmed = value?.trim()
  return trimmed || '—'
}

export type DetailField = { label: string; value?: string | null }

export type DetailSection = { title: string; fields: DetailField[] }

export function loanApplicationSections(app: LoanApplication): DetailSection[] {
  return [
    {
      title: 'Application overview',
      fields: [
        { label: 'Applicant type', value: app.applicantType },
        { label: 'CNIC status', value: app.cnicStatus },
        { label: 'Marital status', value: app.maritalStatus },
        { label: 'Gender', value: app.gender },
        { label: 'Employment status', value: app.employmentStatus },
        { label: 'Monthly income range', value: app.monthlyIncomeRange },
        { label: 'Purpose of financing', value: app.purposeOfFinancing },
        { label: 'Property type', value: app.propertyType },
        { label: 'Property status', value: app.propertyStatus },
        { label: 'Property ownership', value: app.propertyOwnership },
        { label: 'Property size', value: app.propertySize },
        { label: 'Required loan amount', value: loanAmountLabel(app) },
        { label: 'Preferred loan tenure', value: app.preferredLoanTenure },
        { label: 'Current home ownership', value: app.currentHomeOwnership },
        { label: 'Preferred bank', value: app.preferredBank },
        { label: 'City', value: app.city },
      ],
    },
    {
      title: 'Personal details',
      fields: [
        { label: 'Full name', value: app.fullName },
        { label: 'Father / husband name', value: app.fatherOrHusbandName },
        { label: 'CNIC number', value: app.cnicNumber },
        { label: 'Date of birth', value: app.dateOfBirth },
        { label: 'Mobile number', value: app.mobileNumber },
        { label: 'Email', value: app.email },
        { label: 'Current address', value: app.currentAddress },
        { label: 'Permanent address', value: app.permanentAddress },
        { label: 'Province', value: app.province },
      ],
    },
    {
      title: 'Financial details',
      fields: [
        { label: 'Monthly gross income', value: app.monthlyGrossIncome },
        { label: 'Monthly net income', value: app.monthlyNetIncome },
        { label: 'Existing monthly loan installments', value: app.existingMonthlyLoanInstallments },
        { label: 'Monthly rent', value: app.monthlyRent },
        { label: 'Other income', value: app.otherIncome },
        { label: 'Employment / business name', value: app.employmentOrBusinessName },
        { label: 'Years in employment / business', value: app.yearsInEmploymentOrBusiness },
      ],
    },
  ]
}
