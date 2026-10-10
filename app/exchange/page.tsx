"use client";

import { useState, type FormEvent } from "react";

type CurrencyCode = "SAR" | "YER" | "USD";

type SavedTransfer = {
  transferNumber: string;
  amount: number;
  amountCurrency: CurrencyCode;
  receiverGets?: number;
  receiver?: {
    firstName?: string;
    secondName?: string;
    surname?: string;
  };
  exchangedAmountSar?: number;
};

type ExchangeTransfer = {
  number: string;
  availableAmount: number;
  beneficiary: string;
  sourceAmount: number;
  sourceCurrency: CurrencyCode;
  exchangedAmountSar: number;
};

type ExchangeReceipt = {
  receiptNumber: string;
  transferNumber: string;
  beneficiary: string;
  sourceAmount: number;
  sourceCurrency: CurrencyCode;
  receivedAmount: number;
  targetCurrency: CurrencyCode;
  rate: number;
  createdAt: string;
};

const transfersStorageKey = "remittance-transfers";

// معدل الوحدة الناتجة لكل وحدة من العملة المرسلة.
const exchangeRates: Record<
  CurrencyCode,
  Partial<Record<CurrencyCode, number>>
> = {
  SAR: { YER: 140, USD: 3.7 },
  YER: { SAR: 1 / 140, USD: 1 / 530 },
  USD: { SAR: 1 / 3.7, YER: 530 },
};

// عدد وحدات كل عملة التي تعادل ريالاً سعودياً، لحساب المتبقي من الحوالات القديمة.
const unitsPerSar: Record<CurrencyCode, number> = {
  SAR: 1,
  YER: 140,
  USD: 3.7,
};

const currencyNames: Record<CurrencyCode, string> = {
  SAR: "ريال سعودي",
  YER: "ريال يمني",
  USD: "دولار أمريكي",
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

function isCurrencyCode(value: unknown): value is CurrencyCode {
  return value === "SAR" || value === "YER" || value === "USD";
}

function formatAmount(value: number) {
  return value.toLocaleString("ar", { maximumFractionDigits: 2 });
}

export default function ExchangePage() {
  const [transferNumber, setTransferNumber] = useState("");
  const [transfer, setTransfer] = useState<ExchangeTransfer | null>(null);
  const [amountToExchange, setAmountToExchange] = useState("");
  const [targetCurrency, setTargetCurrency] = useState<CurrencyCode>("YER");
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<ExchangeReceipt | null>(null);

  const rate = transfer
    ? exchangeRates[transfer.sourceCurrency][targetCurrency]
    : undefined;
  const inputAmount = Number(amountToExchange || 0);
  const convertedAmount = inputAmount * (rate ?? 0);
  const remainingAmount = Math.max(
    0,
    Number(transfer?.availableAmount || 0) - inputAmount,
  );
  const sameCurrency = Boolean(
    transfer && transfer.sourceCurrency === targetCurrency,
  );

  function searchTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotFound(false);
    setMessage("");
    setAmountToExchange("");
    setTransfer(null);
    setReceipt(null);

    try {
      const parsed: unknown = JSON.parse(
        localStorage.getItem(transfersStorageKey) || "[]",
      );
      const records = Array.isArray(parsed) ? (parsed as SavedTransfer[]) : [];
      const wanted = transferNumber.trim().toUpperCase();
      const found = records.find(
        (item) => item.transferNumber?.trim().toUpperCase() === wanted,
      );

      if (found && isCurrencyCode(found.amountCurrency)) {
        const sourceAmount = Number(found.receiverGets ?? found.amount ?? 0);
        const exchangedAmountSar = Number(found.exchangedAmountSar || 0);
        const alreadyExchangedInSource =
          exchangedAmountSar * unitsPerSar[found.amountCurrency];
        const availableAmount = Math.max(
          0,
          sourceAmount - alreadyExchangedInSource,
        );
        const beneficiary = [
          found.receiver?.firstName,
          found.receiver?.secondName,
          found.receiver?.surname,
        ]
          .filter(Boolean)
          .join(" ");

        setTransfer({
          number: found.transferNumber,
          availableAmount,
          beneficiary: beneficiary || "—",
          sourceAmount,
          sourceCurrency: found.amountCurrency,
          exchangedAmountSar,
        });
        // اختر اليمني افتراضياً، مع تجنب تطابقه مع عملة الحوالة.
        setTargetCurrency(found.amountCurrency === "YER" ? "SAR" : "YER");
        return;
      }
    } catch {
      // عند تعذر قراءة التخزين، تُعرض نافذة عدم العثور.
    }

    setNotFound(true);
  }

  function confirmExchange() {
    if (!transfer) return;
    if (transfer.sourceCurrency === targetCurrency) {
      setMessage("لا يمكن صرف الحوالة إلى العملة نفسها المرسلة.");
      return;
    }

    const value = Number(amountToExchange);
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      value > transfer.availableAmount ||
      !rate
    ) {
      setMessage("أدخل مبلغًا صحيحًا لا يتجاوز المتبقي من الحوالة.");
      return;
    }

    try {
      const parsed: unknown = JSON.parse(
        localStorage.getItem(transfersStorageKey) || "[]",
      );
      const records = Array.isArray(parsed) ? (parsed as SavedTransfer[]) : [];
      const index = records.findIndex(
        (item) => item.transferNumber === transfer.number,
      );

      if (index < 0) {
        setMessage("لم يتم العثور على الحوالة المحفوظة. أعد البحث عنها.");
        return;
      }

      const addedAmountSar = value / unitsPerSar[transfer.sourceCurrency];
      const updatedExchangedAmountSar =
        transfer.exchangedAmountSar + addedAmountSar;
      const updatedRecords = [...records];
      updatedRecords[index] = {
        ...updatedRecords[index],
        exchangedAmountSar: updatedExchangedAmountSar,
      };
      localStorage.setItem(transfersStorageKey, JSON.stringify(updatedRecords));

      const exchangedAt = new Date();
      setReceipt({
        receiptNumber: `EX-${exchangedAt.getTime()}`,
        transferNumber: transfer.number,
        beneficiary: transfer.beneficiary,
        sourceAmount: value,
        sourceCurrency: transfer.sourceCurrency,
        receivedAmount: value * rate,
        targetCurrency,
        rate,
        createdAt: exchangedAt.toLocaleString("ar", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      });

      setTransfer({
        ...transfer,
        availableAmount: Math.max(0, transfer.availableAmount - value),
        exchangedAmountSar: updatedExchangedAmountSar,
      });
      setAmountToExchange("");
      setMessage("تم تسجيل المصارفة وحفظ المتبقي من الحوالة.");
    } catch {
      setMessage("تعذر حفظ عملية المصارفة في التخزين المحلي.");
    }
  }

  return (
    <>
      <main
        dir="rtl"
        className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 lg:px-8 print:hidden"
      >
        <div className="mx-auto max-w-5xl">
          {receipt && (
            <div className="mb-4 flex justify-start print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
              >
                طباعة سند المصارفة
              </button>
            </div>
          )}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <form
              onSubmit={searchTransfer}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <input
                value={transferNumber}
                onChange={(event) => setTransferNumber(event.target.value)}
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                placeholder="أدخل رقم الحوالة"
                aria-label="رقم الحوالة"
                required
                className={`${inputClass} sm:flex-1`}
              />
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-l from-sky-700 to-blue-800 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:from-sky-800 hover:to-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                البحث عن الحوالة
              </button>
            </form>
          </section>

          {transfer && (
            <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
                <span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-lg text-emerald-700">
                  ✓
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    رقم الحوالة: {transfer.number}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    المستفيد: {transfer.beneficiary} · مبلغ الاستلام الأصلي:{" "}
                    {formatAmount(transfer.sourceAmount)}{" "}
                    {currencyNames[transfer.sourceCurrency]}
                  </p>
                </div>
              </div>

              <form
                className="grid gap-3 sm:grid-cols-2"
                onSubmit={(event) => event.preventDefault()}
              >
                <div>
                  <label
                    htmlFor="partial-amount"
                    className="mb-1.5 block text-xs font-medium text-slate-700"
                  >
                    المبلغ المراد صرفه ({currencyNames[transfer.sourceCurrency]}
                    )
                  </label>
                  <input
                    id="partial-amount"
                    type="number"
                    min="0.01"
                    max={transfer.availableAmount}
                    step="any"
                    value={amountToExchange}
                    onChange={(event) => {
                      setAmountToExchange(event.target.value);
                      setMessage("");
                    }}
                    placeholder="أدخل المبلغ"
                    className={inputClass}
                    required
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    المتاح: {formatAmount(transfer.availableAmount)}{" "}
                    {currencyNames[transfer.sourceCurrency]}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="target-currency"
                    className="mb-1.5 block text-xs font-medium text-slate-700"
                  >
                    عملة الصرف
                  </label>
                  <select
                    id="target-currency"
                    value={targetCurrency}
                    onChange={(event) => {
                      setTargetCurrency(event.target.value as CurrencyCode);
                      setMessage("");
                    }}
                    className={inputClass}
                  >
                    {(Object.keys(currencyNames) as CurrencyCode[]).map(
                      (currency) => (
                        <option key={currency} value={currency}>
                          {currencyNames[currency]}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="converted-amount"
                    className="mb-1.5 block text-xs font-medium text-slate-700"
                  >
                    المبلغ الناتج ({currencyNames[targetCurrency]})
                  </label>
                  <input
                    disabled
                    id="converted-amount"
                    value={
                      amountToExchange && rate && !sameCurrency
                        ? `${formatAmount(convertedAmount)} ${currencyNames[targetCurrency]}`
                        : ""
                    }
                    readOnly
                    placeholder={
                      sameCurrency
                        ? "اختر عملة مختلفة عن عملة الحوالة"
                        : "سيظهر المبلغ بعد إدخاله"
                    }
                    className={`${inputClass} bg-slate-50`}
                  />
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
                  <span className="text-xs text-slate-600">سعر الصرف</span>
                  <span className="text-sm font-bold text-blue-900">
                    {rate
                      ? `1 ${currencyNames[transfer.sourceCurrency]} = ${formatAmount(rate)} ${currencyNames[targetCurrency]}`
                      : "غير متاح"}
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 px-3 py-2.5 sm:col-span-2">
                  <p className="text-xs text-slate-500">
                    المتبقي من الحوالة بعد المصارفة
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {formatAmount(
                      amountToExchange
                        ? remainingAmount
                        : transfer.availableAmount,
                    )}{" "}
                    {currencyNames[transfer.sourceCurrency]}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={confirmExchange}
                    disabled={
                      !amountToExchange ||
                      inputAmount <= 0 ||
                      inputAmount > transfer.availableAmount ||
                      sameCurrency ||
                      !rate
                    }
                    className="w-full rounded-lg bg-gradient-to-l from-sky-700 to-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-sky-800 hover:to-blue-900 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-44"
                  >
                    متابعة المصارفة
                  </button>
                  {sameCurrency && (
                    <p role="alert" className="mt-2 text-sm text-red-700">
                      لا يمكن صرف العملة إلى العملة نفسها المرسلة.
                    </p>
                  )}
                  {message && (
                    <p role="status" className="mt-2 text-sm text-blue-800">
                      {message}
                    </p>
                  )}
                </div>
              </form>
            </section>
          )}
        </div>

        {notFound && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
            role="presentation"
            onClick={() => setNotFound(false)}
          >
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="not-found-title"
              className="w-full max-w-sm rounded-xl bg-white p-5 text-center shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto grid size-10 place-items-center rounded-full bg-red-50 text-lg text-red-600">
                !
              </div>
              <h2
                id="not-found-title"
                className="mt-3 text-base font-bold text-slate-900"
              >
                الحوالة غير موجودة
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                تحقق من رقم الحوالة وحاول البحث مرة أخرى.
              </p>
              <button
                type="button"
                onClick={() => setNotFound(false)}
                className="mt-4 rounded-lg bg-blue-800 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-900"
              >
                حسناً
              </button>
            </section>
          </div>
        )}
      </main>

      {receipt && (
        <section
          dir="rtl"
          aria-label="سند مصارفة قابل للطباعة"
          className="mx-auto mt-6 hidden w-full max-w-3xl border border-slate-300 bg-white p-6 text-slate-900 sm:p-8 print:mt-0 print:!block print:min-h-0 print:w-full print:max-w-none print:border-0 print:p-6 print:break-inside-avoid"
        >
          <div className="mb-6 flex items-start justify-between border-b-2 border-slate-800 pb-4">
            <div>
              <h1 className="text-2xl font-bold">سند مصارفة</h1>
              <p className="mt-1 text-sm text-slate-600">
                إيصال صرف عملة حوالة
              </p>
            </div>
            <div className="text-left text-sm">
              <p>
                <span className="font-semibold">رقم السند:</span>{" "}
                {receipt.receiptNumber}
              </p>
              <p className="mt-1">
                <span className="font-semibold">التاريخ:</span>{" "}
                {receipt.createdAt}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-slate-200 py-2">
              <span className="font-semibold">رقم الحوالة</span>
              <span>{receipt.transferNumber}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-200 py-2">
              <span className="font-semibold">اسم المستفيد</span>
              <span>{receipt.beneficiary}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-200 py-2">
              <span className="font-semibold">المبلغ المصروف من الحوالة</span>
              <span>
                {formatAmount(receipt.sourceAmount)}{" "}
                {currencyNames[receipt.sourceCurrency]}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-200 py-2">
              <span className="font-semibold">سعر الصرف</span>
              <span>
                1 {currencyNames[receipt.sourceCurrency]} ={" "}
                {formatAmount(receipt.rate)}{" "}
                {currencyNames[receipt.targetCurrency]}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b-2 border-slate-800 py-3 text-base">
              <span className="font-bold">المبلغ المسلم للمستفيد</span>
              <span className="font-bold">
                {formatAmount(receipt.receivedAmount)}{" "}
                {currencyNames[receipt.targetCurrency]}
              </span>
            </div>
          </div>

          <div className="mt-16 flex justify-between gap-10 text-center text-sm">
            <div className="w-1/2 border-t border-slate-500 pt-2">
              توقيع المستفيد
            </div>
            <div className="w-1/2 border-t border-slate-500 pt-2">
              ختم وتوقيع الموظف
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-slate-500">
            يرجى الاحتفاظ بهذا السند.
          </p>
        </section>
      )}
    </>
  );
}
