// Dev-only primitives sheet: /preview-landing.html?s=__ui
// Mirrors fleetguard-design-handoff/assets/fleetguard-component-sheet.png §04 Buttons, §05 Inputs,
// §06 Badges (plus a token strip for colors / type to eyeball Task 2).
import { Check, ChevronRight, CircleX } from 'lucide-react'
import FleetGuardLogo from '@/components/brand/FleetGuardLogo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const COLORS = [
  'brand', 'brand-dark', 'brand-darker', 'brand-50', 'brand-100', 'navy', 'ink', 'ink-subtle',
  'surface', 'line', 'success', 'info', 'warning', 'danger', 'violet', 'footer',
]
const SWATCH = {
  brand: 'bg-brand', 'brand-dark': 'bg-brand-dark', 'brand-darker': 'bg-brand-darker',
  'brand-50': 'bg-brand-50', 'brand-100': 'bg-brand-100', navy: 'bg-navy', ink: 'bg-ink',
  'ink-subtle': 'bg-ink-subtle', surface: 'bg-surface', line: 'bg-line', success: 'bg-success',
  info: 'bg-info', warning: 'bg-warning', danger: 'bg-danger', violet: 'bg-violet', footer: 'bg-footer',
}
const TYPE = [
  ['text-display', 'Display 48/56'],
  ['text-h1', 'Heading 1 40/48'],
  ['text-h2', 'Heading 2 32/40'],
  ['text-h3', 'Heading 3 24/32'],
  ['text-h4', 'Heading 4 20/28'],
  ['text-body-lg', 'Body Large 16/26'],
  ['text-body', 'Body 14/22'],
  ['text-body-sm', 'Body Small 12/18'],
  ['text-caption', 'Caption 11/16'],
]

const BUTTON_COLUMNS = [
  ['default', 'Primary', 'Dùng thử miễn phí'],
  ['outline', 'Secondary', 'Xem demo'],
  ['ghost', 'Ghost', 'Tìm hiểu thêm'],
  ['link', 'Text Link', 'Xem chi tiết'],
]
const BUTTON_ROWS = [
  ['Default', {}],
  ['Disabled', { disabled: true }],
  ['Loading', { loading: true }],
]

function SectionTitle({ n, children }) {
  return (
    <h2 className="mb-5 text-h4 text-navy">
      <span className="mr-2 text-brand-dark">{n}.</span>
      {children}
    </h2>
  )
}

function RowLabel({ children }) {
  return <span className="text-body-sm font-medium text-ink">{children}</span>
}

function Tokens() {
  return (
    <section className="grid grid-cols-1 gap-10 lg:grid-cols-2 [&>*]:min-w-0">
      <div>
        <SectionTitle n="01">Colors</SectionTitle>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {COLORS.map((c) => (
            <div key={c} className="flex flex-col gap-1.5">
              <div className={`h-12 rounded-md ring-1 ring-line ${SWATCH[c]}`} />
              <span className="text-caption text-ink">{c}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <div className="h-10 flex-1 rounded-md bg-info/10" />
          <div className="h-10 flex-1 rounded-md bg-warning/10" />
          <div className="h-10 flex-1 rounded-md bg-danger/10" />
          <div className="h-10 flex-1 rounded-md bg-violet/10" />
          <div className="h-10 flex-1 rounded-md bg-success/10" />
        </div>
        <div className="mt-4 flex items-end gap-4">
          {['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl'].map((r) => (
            <div key={r} className={`flex size-16 items-center justify-center bg-surface ring-1 ring-line ${r}`}>
              <span className="text-caption text-ink">{r.replace('rounded-', '')}</span>
            </div>
          ))}
          <div className="flex h-16 w-28 items-center justify-center rounded-lg bg-white shadow-card">
            <span className="text-caption text-ink">shadow-card</span>
          </div>
          <div className="flex h-16 w-28 items-center justify-center rounded-lg bg-white shadow-dashboard">
            <span className="text-caption text-ink">shadow-dashboard</span>
          </div>
        </div>
      </div>
      <div>
        <SectionTitle n="02">Typography</SectionTitle>
        <div className="flex flex-col gap-2">
          {TYPE.map(([cls, label]) => (
            <div key={cls} className="flex items-baseline gap-4">
              <span className="w-36 shrink-0 text-body-sm text-ink">{label}</span>
              <span className={`${cls} truncate text-navy`}>Giám sát đội xe ắ ộ ữ</span>
            </div>
          ))}
          <p className="heading-hero mt-2 text-navy">heading-hero ắ ộ ữ</p>
          <p className="heading-section text-navy">heading-section ắ ộ ữ</p>
        </div>
      </div>
    </section>
  )
}

function Buttons() {
  return (
    <section>
      <SectionTitle n="04">Buttons</SectionTitle>
      <div className="overflow-x-auto">
      <div className="grid min-w-[760px] grid-cols-[96px_repeat(4,minmax(0,1fr))] items-center gap-x-6 gap-y-4">
        <span />
        {BUTTON_COLUMNS.map(([, label]) => (
          <span key={label} className="text-body-sm font-semibold text-navy">
            {label}
          </span>
        ))}
        {BUTTON_ROWS.map(([rowLabel, state]) => (
          <div key={rowLabel} className="contents">
            <RowLabel>{rowLabel}</RowLabel>
            {BUTTON_COLUMNS.map(([variant, , text]) => (
              <div key={variant}>
                <Button variant={variant} {...state}>
                  {text}
                  {variant === 'link' ? <ChevronRight data-icon="inline-end" /> : null}
                </Button>
              </div>
            ))}
          </div>
        ))}
      </div>
      </div>
      <Separator className="my-6" />
      <div className="flex flex-wrap items-center gap-4">
        <RowLabel>Sizes</RowLabel>
        <Button size="sm">Small h-9</Button>
        <Button>Default h-10</Button>
        <Button size="lg">Large h-12</Button>
        <Button size="lg" variant="outline">
          Large outline
        </Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button asChild variant="link">
          <a href="#buttons">
            asChild link
            <ChevronRight data-icon="inline-end" />
          </a>
        </Button>
      </div>
    </section>
  )
}

function IconInput({ icon: Icon, iconClass, ...props }) {
  return (
    <div className="relative">
      <Input className="pr-10" {...props} />
      <Icon className={`pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 ${iconClass}`} />
    </div>
  )
}

function Inputs() {
  return (
    <section>
      <SectionTitle n="05">Inputs</SectionTitle>
      <div className="grid gap-10 md:grid-cols-2">
        <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-x-4 gap-y-4">
          <RowLabel>Default</RowLabel>
          <Input placeholder="Nhập email của bạn" aria-label="Email (default)" />
          <RowLabel>Focus</RowLabel>
          <Input
            placeholder="Nhập email của bạn"
            aria-label="Email (focus)"
            className="border-ring ring-3 ring-ring/20"
          />
          <RowLabel>Filled</RowLabel>
          <IconInput
            icon={Check}
            iconClass="text-success"
            defaultValue="demo@fleetguard.vn"
            aria-label="Email (filled)"
          />
          <RowLabel>Error</RowLabel>
          <IconInput
            icon={CircleX}
            iconClass="text-danger"
            defaultValue="email@"
            aria-invalid="true"
            aria-label="Email (error)"
          />
          <RowLabel>Select</RowLabel>
          <Select>
            <SelectTrigger className="w-full" aria-label="Gói dịch vụ">
              <SelectValue placeholder="Chọn gói dịch vụ" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="basic">Cơ bản</SelectItem>
                <SelectItem value="pro">Nâng cao</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <RowLabel>Disabled</RowLabel>
          <Input placeholder="Nhập email của bạn" aria-label="Email (disabled)" disabled />
        </div>

        <div className="flex flex-col gap-5">
          <span className="text-body-sm font-semibold text-navy">Checkbox &amp; Radio</span>
          <div className="flex flex-col gap-4">
            <Label className="text-body font-normal text-navy">
              <Checkbox defaultChecked />
              Tôi đồng ý với điều khoản sử dụng
            </Label>
            <Label className="text-body font-normal text-navy">
              <Checkbox />
              Nhận bản tin &amp; ưu đãi
            </Label>
          </div>
          <RadioGroup defaultValue="year" className="gap-4">
            <Label className="text-body font-normal text-navy">
              <RadioGroupItem value="month" />
              Thanh toán tháng
            </Label>
            <Label className="text-body font-normal text-navy">
              <RadioGroupItem value="year" />
              <span>
                Thanh toán năm <span className="text-brand-dark">(tiết kiệm 20%)</span>
              </span>
            </Label>
          </RadioGroup>
          <span className="mt-2 text-body-sm font-semibold text-navy">Toggle group</span>
          <ToggleGroup type="single" defaultValue="month" variant="outline" spacing={0}>
            <ToggleGroupItem value="month">Thanh toán tháng</ToggleGroupItem>
            <ToggleGroupItem value="year">Thanh toán năm</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </section>
  )
}

function Badges() {
  return (
    <section>
      <SectionTitle n="06">Badges &amp; Tags</SectionTitle>
      <div className="flex flex-wrap items-center gap-3">
        <Badge>Mới</Badge>
        <Badge variant="info">Khuyến nghị</Badge>
        <Badge variant="warning">Tiết kiệm 20%</Badge>
        <Badge variant="success">Bán chạy</Badge>
        <Badge variant="danger">Nguy hiểm</Badge>
        <Badge variant="violet">Báo cáo</Badge>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {['AI', 'GPS', 'Camera', '24/7', 'Cloud'].map((t) => (
          <Badge key={t} variant="neutral">
            {t}
          </Badge>
        ))}
      </div>
    </section>
  )
}

function CardSample() {
  return (
    <section>
      <SectionTitle n="07">Card</SectionTitle>
      <Card className="max-w-xs">
        <CardHeader>
          <CardTitle className="text-h4 text-navy">Cảnh báo tức thời</CardTitle>
          <CardDescription className="text-body text-ink">
            Phát hiện sớm các hành vi nguy hiểm và gửi cảnh báo ngay lập tức.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="info">Real-time</Badge>
        </CardContent>
      </Card>
    </section>
  )
}

export default function UiSheet() {
  return (
    <main className="min-h-screen bg-white py-10">
      <div className="container-page flex flex-col gap-12">
        <FleetGuardLogo className="text-h4" />
        <Tokens />
        <Separator />
        <div id="buttons">
          <Buttons />
        </div>
        <Separator />
        <Inputs />
        <Separator />
        <div className="grid gap-12 md:grid-cols-2">
          <Badges />
          <CardSample />
        </div>
      </div>
    </main>
  )
}
