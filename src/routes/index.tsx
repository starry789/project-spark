import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Calculator,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileText,
  History,
  Info,
  Landmark,
  Printer,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "학교시설 사용료 산출 시스템 | 서울특별시교육청" },
      { name: "description", content: "학교시설 사용 허가 시 사용료를 산출하고 기준을 관리하는 행정 도구" },
      { property: "og:title", content: "학교시설 사용료 산출 시스템 | 서울특별시교육청" },
      { property: "og:description", content: "학교시설 사용 허가 시 사용료를 산출하고 기준을 관리하는 행정 도구" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type View = "calculator" | "settings" | "ledger";

type FormData = {
  school: string;
  applicant: string;
  phone: string;
  address: string;
  facility: keyof typeof facilities;
  purpose: string;
  startDate: string;
  endDate: string;
  start: string;
  end: string;
  people: number;
  usagePattern: "daily" | "weekly";
  weekdays: number[];
  heating: boolean;
  reductionTarget: keyof typeof reductions;
  reductionRate: number;
  notes: string;
};

const facilities: Record<string, { sports: number; general: number; note: string }> = {
  일반교실: { sports: 10000, general: 20000, note: "1시간 · 1실" },
  "체육관 360㎡ 미만": { sports: 15000, general: 40000, note: "1시간 · 실제 사용면적" },
  "체육관 360㎡ 이상 720㎡ 미만": { sports: 20000, general: 50000, note: "1시간 · 실제 사용면적" },
  "체육관 720㎡ 이상": { sports: 25000, general: 60000, note: "1시간 · 실제 사용면적" },
  "운동장 일반 (단기)": { sports: 20000, general: 50000, note: "1시간" },
  "운동장 일반 (6개월 이상)": { sports: 15000, general: 50000, note: "1시간" },
  "운동장 잔디 포함 (단기)": { sports: 40000, general: 100000, note: "1시간" },
  "운동장 잔디 포함 (6개월 이상)": { sports: 30000, general: 100000, note: "1시간" },
  샤워시설: { sports: 30000, general: 30000, note: "1개월" },
  "창고(물품 보관)": { sports: 30000, general: 30000, note: "1개월" },
  "기타 학교장 결정 시설": { sports: 0, general: 0, note: "소재지·주변 시설 사용료를 고려하여 결정" },
};

const reductions: Record<string, { rate: number; description: string }> = {
  "해당 없음": { rate: 0, description: "감면 적용 없음" },
  "교육청 산하 기관 주관 행사": { rate: 100, description: "전액면제" },
  "자치구 주민 과반 · 6개월 이상 생활체육/평생교육": { rate: 60, description: "60% 감면" },
  "국가유공자·장애인·독립유공자·병역명문가·노인·동창회": { rate: 50, description: "50% 감면" },
  "자치구 주민/근무·영업소·재학자 과반 · 6개월 이상": { rate: 40, description: "40% 감면" },
  "학교장·사용기관 협의": { rate: 0, description: "협의 감면율 입력" },
};

const defaultForm: FormData = {
  school: "서울수색초등학교",
  applicant: "서울마을체육회",
  phone: "02-0000-0000",
  address: "서울특별시 은평구",
  facility: "체육관 360㎡ 이상 720㎡ 미만",
  purpose: "생활체육·평생교육",
  startDate: "2026-09-12",
  endDate: "2026-09-12",
  start: "13:00",
  end: "17:30",
  people: 40,
  usagePattern: "daily",
  weekdays: [0],
  heating: false,
  reductionTarget: "해당 없음",
  reductionRate: 0,
  notes: "",
};

const won = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`;
const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

function countWeeklyUses(start: Date, end: Date, weekdays: number[]) {
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (weekdays.includes(cursor.getDay())) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-foreground/80">{label}</span>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
    >
      {children}
    </select>
  );
}

function Index() {
  const [view, setView] = useState<View>("calculator");
  const [form, setForm] = useState<FormData>(defaultForm);
  const [notice, setNotice] = useState("");

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const calc = useMemo(() => {
    const start = Number(form.start.slice(0, 2)) * 60 + Number(form.start.slice(3));
    const end = Number(form.end.slice(0, 2)) * 60 + Number(form.end.slice(3));
    const invalidTime = end <= start;
    const hours = invalidTime ? 0 : Math.ceil((end - start) / 60);

    const startDate = new Date(`${form.startDate}T00:00:00`);
    const endDate = new Date(`${form.endDate}T00:00:00`);
    const invalidPeriod = endDate < startDate;
    const periodDays = invalidPeriod ? 0 : Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    const sixMonthsAfter = new Date(startDate);
    sixMonthsAfter.setMonth(sixMonthsAfter.getMonth() + 6);
    const isLongTerm = !invalidPeriod && endDate >= sixMonthsAfter;

    const rateFacility =
      form.facility === "운동장 일반 (단기)" || form.facility === "운동장 일반 (6개월 이상)"
        ? isLongTerm
          ? facilities["운동장 일반 (6개월 이상)"]
          : facilities["운동장 일반 (단기)"]
        : form.facility === "운동장 잔디 포함 (단기)" || form.facility === "운동장 잔디 포함 (6개월 이상)"
          ? isLongTerm
            ? facilities["운동장 잔디 포함 (6개월 이상)"]
            : facilities["운동장 잔디 포함 (단기)"]
          : facilities[form.facility];

    const facility = rateFacility;
    const unitRate = form.purpose === "생활체육·평생교육" ? facility.sports : facility.general;
    const monthUnit = form.facility === "샤워시설" || form.facility === "창고(물품 보관)";
    const months = Math.max(
      1,
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        endDate.getMonth() -
        startDate.getMonth() +
        (endDate.getDate() >= startDate.getDate() ? 1 : 0),
    );
    const useCount = invalidPeriod ? 0 : form.usagePattern === "weekly" ? countWeeklyUses(startDate, endDate, form.weekdays) : periodDays;
    const chargeUnits = monthUnit ? months : hours * useCount;
    const baseFee = unitRate * chargeUnits;
    const utilityFee = form.heating ? baseFee * 0.2 : 0;

    const rate = Math.max(0, Math.min(100, form.reductionRate));
    const reductionBase = rate === 100 ? baseFee + utilityFee : baseFee;
    const reductionFee = reductionBase * rate / 100;
    const total = Math.max(0, baseFee + utilityFee - reductionFee);

    return {
      invalidTime,
      invalidPeriod,
      hours,
      periodDays,
      isLongTerm,
      months,
      useCount,
      chargeUnits,
      monthUnit,
      facility,
      unitRate,
      baseFee,
      utilityFee,
      reductionFee,
      total,
      rate,
    };
  }, [form]);

  const selectReduction = (target: keyof typeof reductions) => {
    update("reductionTarget", target);
    update("reductionRate", reductions[target].rate);
  };

  const toggleWeekday = (day: number) =>
    update(
      "weekdays",
      form.weekdays.includes(day) ? form.weekdays.filter((item) => item !== day) : [...form.weekdays, day],
    );

  const save = () =>
    setNotice(
      calc.invalidPeriod
        ? "사용 종료일은 시작일과 같거나 이후여야 합니다."
        : calc.invalidTime
          ? "종료 시간은 시작 시간 이후로 입력해 주세요."
          : "산출 내역이 사용허가 대장에 저장되었습니다. (현재는 시연 데이터입니다.)",
    );

  const nav: Array<{ key: View; label: string; icon: LucideIcon }> = [
    { key: "calculator", label: "신청·사용료 산출", icon: Calculator },
    { key: "settings", label: "사용료 기준 관리", icon: Settings2 },
    { key: "ledger", label: "사용허가 대장", icon: History },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Landmark className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-primary">서울특별시교육청</p>
              <h1 className="text-base font-semibold">학교시설 사용허가·사용료 산출 시스템</h1>
            </div>
          </div>
          <span className="hidden text-sm text-muted-foreground sm:block">조례 제9920호 기준 · 2026. 1. 8. 시행</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:px-8">
        <aside className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <p className="px-3 pb-2 pt-1 text-xs font-bold tracking-wider text-muted-foreground">시설 사용 관리</p>
          {nav.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
                view === key ? "bg-secondary text-primary" : "text-foreground/70 hover:bg-muted"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
          <div className="mt-6 rounded-xl bg-muted p-3 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mb-2 size-4 text-primary" />
            별표 외 시설은 학교장이 소재지 또는 주변 지역의 시설 사용료 등을 고려하여 별도 결정합니다.
          </div>
        </aside>

        {view === "calculator" && (
          <section>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary">별지 제1호 신청서 · 별지 제2호 허가서 연계</p>
                <h2 className="mt-1 text-2xl font-bold">학교시설 사용 허가 신청 및 사용료 산출</h2>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setForm(defaultForm)}>
                  초기화
                </Button>
                <Button onClick={save}>
                  <ClipboardList />
                  대장에 저장
                </Button>
              </div>
            </div>

            {notice && (
              <output className="mb-4 block rounded-xl border border-primary/20 bg-secondary px-4 py-3 text-sm text-primary">
                {notice}
              </output>
            )}
            {calc.invalidPeriod && (
              <div role="alert" className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                사용 종료일은 시작일과 같거나 이후여야 합니다.
              </div>
            )}
            {calc.invalidTime && (
              <div role="alert" className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                종료 시간은 시작 시간보다 늦어야 합니다.
              </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-5">
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-5 flex items-center gap-2">
                    <Users className="size-5 text-primary" />
                    <h3 className="font-bold">신청인 정보</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="학교명">
                      <Input value={form.school} onChange={(e) => update("school", e.target.value)} />
                    </Field>
                    <Field label="신청인/단체명">
                      <Input value={form.applicant} onChange={(e) => update("applicant", e.target.value)} />
                    </Field>
                    <Field label="전화">
                      <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                    </Field>
                    <Field label="주소">
                      <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
                    </Field>
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-5 flex items-center gap-2">
                    <Building2 className="size-5 text-primary" />
                    <h3 className="font-bold">시설 및 사용 정보</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="사용 시설명">
                      <Select value={form.facility} onChange={(v) => update("facility", v as keyof typeof facilities)}>
                        {Object.keys(facilities).map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="사용 목적">
                      <Select value={form.purpose} onChange={(v) => update("purpose", v)}>
                        <option>생활체육·평생교육</option>
                        <option>일반·행사</option>
                      </Select>
                    </Field>
                    <Field label="사용 시작일">
                      <Input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
                    </Field>
                    <Field label="사용 종료일">
                      <Input type="date" value={form.endDate} min={form.startDate} onChange={(e) => update("endDate", e.target.value)} />
                    </Field>
                    <Field label="사용 방식">
                      <Select value={form.usagePattern} onChange={(v) => update("usagePattern", v as "daily" | "weekly")}>
                        <option value="daily">기간 내 매일 사용</option>
                        <option value="weekly">매주 지정 요일 사용</option>
                      </Select>
                    </Field>
                    <Field label="사용 인원">
                      <Input type="number" min="1" value={form.people} onChange={(e) => update("people", Number(e.target.value))} />
                    </Field>
                    <Field label="시작 시간">
                      <Input type="time" value={form.start} onChange={(e) => update("start", e.target.value)} />
                    </Field>
                    <Field label="종료 시간">
                      <Input type="time" value={form.end} onChange={(e) => update("end", e.target.value)} />
                    </Field>
                  </div>

                  {form.usagePattern === "weekly" && (
                    <div className="mt-4 rounded-xl border border-primary/20 bg-secondary p-4">
                      <p className="mb-3 text-sm font-semibold text-primary">반복 요일 선택</p>
                      <div className="flex flex-wrap gap-3">
                        {weekdayLabels.map((label, day) => (
                          <label key={label} className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                            <Checkbox checked={form.weekdays.includes(day)} onCheckedChange={() => toggleWeekday(day)} />
                            {label}요일
                          </label>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">선택한 요일에만 기간 내 사용 횟수와 사용료를 산정합니다.</p>
                    </div>
                  )}

                  <div className="mt-4 grid gap-3 rounded-xl bg-muted px-4 py-3 sm:grid-cols-4">
                    <span className="text-sm text-muted-foreground">
                      사용기간 <b className="text-primary">{calc.periodDays}일</b>
                    </span>
                    <span className="text-sm text-muted-foreground">
                      실제 사용횟수 <b className="text-primary">{calc.useCount}회</b>
                    </span>
                    <span className="text-sm text-muted-foreground">
                      일별 사용시간 <b className="text-primary">{calc.hours}시간</b>
                    </span>
                    <span className="text-sm text-muted-foreground">
                      구분 <b className="text-primary">{calc.isLongTerm ? "6개월 이상 장기사용" : "일시·단기사용"}</b>
                    </span>
                    <span className="col-span-full text-xs text-muted-foreground">
                      준비·정리시간을 포함하며 1시간 미만은 1시간으로 산정합니다. 장기사용 운동장은 6개월 이상일 때 장기 단가가 자동 적용됩니다.
                    </span>
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-5 flex items-center gap-2">
                    <CalendarDays className="size-5 text-primary" />
                    <h3 className="font-bold">감면 및 관리비</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="감면 대상">
                      <Select value={form.reductionTarget} onChange={(v) => selectReduction(v as keyof typeof reductions)}>
                        {Object.keys(reductions).map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="감면율 (%)" hint="감면 사유가 중복되면 하나만 적용합니다.">
                      <Input type="number" min="0" max="100" value={form.reductionRate} onChange={(e) => update("reductionRate", Number(e.target.value))} />
                    </Field>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                      <span>
                        <b className="block text-sm">냉난방기 가동</b>
                        <span className="text-xs text-muted-foreground">별표 기준 사용료의 20% 가산</span>
                      </span>
                      <Switch aria-label="냉난방기 가동" checked={form.heating} onCheckedChange={(value) => update("heating", value)} />
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                      <Info className="mb-1 size-4" />
                      60·50·40% 감면은 공공요금에 적용하지 않습니다. 조명·음향·청소 등 별도 항목은 현행 조례상 자동 부과하지 않습니다.
                    </div>
                  </div>
                  <Field label="기타">
                    <Textarea
                      value={form.notes}
                      onChange={(e) => update("notes", e.target.value)}
                      className="mt-1 min-h-20"
                      placeholder="허가 조건, 협의사항 등을 입력하세요."
                    />
                  </Field>
                </section>
              </div>

              <aside className="h-fit rounded-2xl bg-primary p-5 text-primary-foreground shadow-lg xl:sticky xl:top-5">
                <div className="flex items-center justify-between border-b border-white/20 pb-4">
                  <div>
                    <p className="text-xs font-semibold text-primary-foreground/70">예상 납부 사용료</p>
                    <p className="mt-1 text-3xl font-bold">{won(calc.total)}</p>
                  </div>
                  <Calculator className="size-9 text-primary-foreground/70" />
                </div>
                <div className="space-y-3 py-5 text-sm">
                  <div className="flex justify-between text-primary-foreground/80">
                    <span>기본 사용료</span>
                    <span>{won(calc.baseFee)}</span>
                  </div>
                  <div className="flex justify-between text-primary-foreground/80">
                    <span>냉난방기 가산 (20%)</span>
                    <span>{won(calc.utilityFee)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/20 pt-3 text-green-200">
                    <span>감면액 ({calc.rate}%)</span>
                    <span>- {won(calc.reductionFee)}</span>
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 p-3 text-xs leading-5 text-primary-foreground/80">
                  <b className="text-primary-foreground">산출 기초</b>
                  <br />
                  사용기간 {form.startDate} ~ {form.endDate} ({calc.periodDays}일)
                  <br />
                  {form.usagePattern === "weekly"
                    ? `매주 ${form.weekdays.map((day) => weekdayLabels[day]).join("·")}요일 사용 (${calc.useCount}회)`
                    : `기간 내 매일 사용 (${calc.useCount}회)`}
                  <br />
                  {form.facility} · {form.purpose} · {calc.facility.note}
                  <br />
                  {won(calc.unitRate)} × {calc.monthUnit ? `${calc.months}개월` : `${calc.hours}시간 × ${calc.useCount}회`} {form.heating && !calc.monthUnit ? " + 냉난방기 20%" : ""}
                  <br />
                  기준: 조례 제8조·제9조 및 별표
                </div>
                <Button variant="secondary" className="mt-4 h-10 w-full bg-white text-primary" onClick={() => window.print()}>
                  <Printer />
                  허가서·산출서 인쇄
                </Button>
              </aside>
            </div>
          </section>
        )}

        {view === "settings" && <SettingsView />}
        {view === "ledger" && <LedgerView />}
      </div>
    </main>
  );
}

function SettingsView() {
  return (
    <section>
      <p className="text-sm font-semibold text-primary">관리자 기준값</p>
      <h2 className="mt-1 text-2xl font-bold">조례 별표 사용료 기준</h2>
      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-5">
          <h3 className="font-bold">시설별 1시간 사용료</h3>
          <p className="mt-1 text-sm text-muted-foreground">별표(제4조 및 제8조 관련)를 초기값으로 적용합니다. 기타 시설은 학교장 결정 단가를 등록하세요.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                {["시설", "생활체육·평생교육", "일반·행사", "기준"].map((head) => (
                  <th key={head} className="px-5 py-3 font-semibold">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(facilities).map(([name, item]) => (
                <tr key={name} className="border-t border-border">
                  <td className="px-5 py-4 font-semibold">{name}</td>
                  <td className="px-5 py-4">{item.sports ? won(item.sports) : "별도 등록"}</td>
                  <td className="px-5 py-4">{item.general ? won(item.general) : "별도 등록"}</td>
                  <td className="px-5 py-4 text-muted-foreground">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-bold">감면 기준</h3>
          <div className="mt-4 space-y-3">
            {Object.entries(reductions).map(([name, item]) => (
              <div key={name} className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{name}</span>
                <b className="shrink-0">{item.rate}%</b>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-secondary p-5">
          <h3 className="font-bold text-primary">운영 검토 항목</h3>
          <ul className="mt-3 space-y-2 text-sm leading-5 text-foreground/80">
            <li>· 신청은 원칙적으로 사용시작 7일 전까지 접수</li>
            <li>· 생활체육 구기종목은 1일 3시간, 추가는 1시간 이내</li>
            <li>· 6개월 이상 허가 시 분할납부 여부 검토</li>
            <li>· 사용료는 사용개시 전일까지 납부</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function LedgerView() {
  const rows = [
    ["2026.09.07", "서울마을체육회", "체육관", "생활체육·평생교육", "2026.09.12", "5시간", "96,000원"],
    ["2026.09.05", "은평구청", "강당", "일반·행사", "2026.09.10", "2시간", "120,000원"],
  ];

  return (
    <section>
      <p className="text-sm font-semibold text-primary">별지 제3호서식</p>
      <h2 className="mt-1 text-2xl font-bold">학교시설 사용허가 대장</h2>
      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h3 className="font-bold">서울수색초등학교 · 2026년도</h3>
            <p className="mt-1 text-sm text-muted-foreground">신청일자, 신청자, 시설, 목적, 기간, 시간, 사용료와 비고를 보존합니다.</p>
          </div>
          <Button variant="outline">
            <FileText />
            대장 출력
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                {["신청일자", "신청자(단체)", "사용시설", "사용목적", "사용일자(기간)", "사용시간", "사용료(원)", ""].map((head) => (
                  <th key={head} className="px-5 py-3 font-semibold">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row[0] + row[1]} className="border-t border-border">
                  {row.map((cell, index) => (
                    <td key={cell} className={`px-5 py-4 ${index === 6 ? "font-bold text-primary" : "text-muted-foreground"}`}>
                      {cell}
                    </td>
                  ))}
                  <td>
                    <Button variant="ghost" size="sm">
                      상세 <ChevronRight />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
