"use client";

import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import invoiceLogo from "@/public/invoiceLogo.jpg";

const inputClass =
  "mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

type Currency = "SAR" | "YER" | "USD";
type CommissionMode = "deduct" | "add";
const TRANSFERS_STORAGE_KEY = "remittance-transfers";

const currencyLabels: Record<Currency, string> = {
  SAR: "ريال سعودي",
  YER: "ريال يمني",
  USD: "دولار أمريكي",
};

// عدد وحدات العملة مقابل الريال السعودي
const ratesPerSar: Record<Currency, number> = {
  SAR: 1,
  YER: 140,
  USD: 3.8,
};

const fixedCommission: Record<Currency, number> = {
  YER: 300,
  SAR: 3,
  USD: 2,
};

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-blue-50 text-base text-blue-700">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  id,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  id: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-[11px] leading-4 text-slate-600">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        required={required}
        className={inputClass}
      />
    </div>
  );
}

function NameFields({ prefix }: { prefix: "sender" | "receiver" }) {
  return (
    <>
      <Field
        id={`${prefix}-first-name`}
        label="الاسم الأول"
        placeholder="الاسم الأول"
        required
      />
      <Field
        id={`${prefix}-second-name`}
        label="الاسم الثاني"
        placeholder="الاسم الثاني"
        required
      />
      <Field
        id={`${prefix}-surname`}
        label="الاسم الثالث واللقب"
        placeholder="اللقب"
        required
      />
    </>
  );
}

type TransferRecord = {
  sender: {
    firstName: string;
    secondName: string;
    surname: string;
    city: string;
    address: string;
    phone: string;
    note: string;
    id: string;
    frontImage: string;
    backImage: string;
  };
  receiver: {
    firstName: string;
    secondName: string;
    surname: string;
    address: string;
    city: string;
    phone: string;
    note: string;
  };
  amount: number;
  amountCurrency: Currency;
  commissionCurrency: Currency;
  commissionMode: CommissionMode;
  commission: number;
  commissionInAmountCurrency: number;
  receiverGets: number;
  senderPays: number;
  sentDate: string;
  transferNumber?: string;
};

function formatMoney(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function fullName(
  person: TransferRecord["sender"] | TransferRecord["receiver"],
) {
  return [person.firstName, person.secondName, person.surname]
    .filter(Boolean)
    .join(" ");
}

function readImageFile(
  event: ChangeEvent<HTMLInputElement>,
  setPreview: (value: string) => void,
) {
  const file = event.currentTarget.files?.[0];

  if (!file) {
    setPreview("");
    return;
  }

  if (!file.type.startsWith("image/")) {
    event.currentTarget.value = "";
    setPreview("");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      setPreview(reader.result);
    }
  };
  reader.readAsDataURL(file);
}

function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("تعذر قراءة صورة البطاقة"));
      }
    };

    reader.onerror = () => reject(new Error("تعذر قراءة صورة البطاقة"));
    reader.readAsDataURL(file);
  });
}

function generateTransferNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const randomPart = Math.floor(10000000 + Math.random() * 90000000);
  return `TR-${datePart}-${randomPart}`;
}

type StoredTransfer = TransferRecord & { transferNumber: string };

function readStoredTransfers(): StoredTransfer[] {
  try {
    const raw = localStorage.getItem(TRANSFERS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as StoredTransfer[]) : [];
  } catch {
    return [];
  }
}

function saveTransferToLocalStorage(transfer: StoredTransfer) {
  try {
    const existingTransfers = readStoredTransfers();
    // صور الهوية لا تُحفظ محليًا لتجنب امتلاء مساحة التخزين.
    const transferForStorage: StoredTransfer = {
      ...transfer,
      sender: { ...transfer.sender, frontImage: "", backImage: "" },
    };
    const updatedTransfers = [
      transferForStorage,
      ...existingTransfers
        .filter((item) => item.transferNumber !== transfer.transferNumber)
        .map((item) => ({
          ...item,
          sender: { ...item.sender, frontImage: "", backImage: "" },
        })),
    ];
    localStorage.setItem(
      TRANSFERS_STORAGE_KEY,
      JSON.stringify(updatedTransfers),
    );
    return true;
  } catch {
    return false;
  }
}

export default function SendPage() {
  const [reviewData, setReviewData] = useState<TransferRecord | null>(null);
  const [sentData, setSentData] = useState<TransferRecord | null>(null);
  const [formError, setFormError] = useState("");
  const [amount, setAmount] = useState("");
  const [amountCurrency, setAmountCurrency] = useState<Currency>("SAR");
  const [commissionCurrency, setCommissionCurrency] = useState<Currency>("SAR");
  const [commissionMode, setCommissionMode] =
    useState<CommissionMode>("deduct");
  const [senderFrontPreview, setSenderFrontPreview] = useState("");
  const [senderBackPreview, setSenderBackPreview] = useState("");
  const [storageWarning, setStorageWarning] = useState("");

  const amountNumber = Number(amount || 0);
  const amountInSar = amountNumber / ratesPerSar[amountCurrency];

  const commission =
    amountInSar > 1000
      ? amountInSar * 0.03 * ratesPerSar[commissionCurrency]
      : fixedCommission[commissionCurrency];

  const commissionInAmountCurrency =
    (commission / ratesPerSar[commissionCurrency]) *
    ratesPerSar[amountCurrency];

  const receiverGets =
    commissionMode === "deduct"
      ? Math.max(0, amountNumber - commissionInAmountCurrency)
      : amountNumber;

  const senderPays =
    commissionMode === "add"
      ? amountNumber + commissionInAmountCurrency
      : amountNumber;

  async function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const formData = new FormData(event.currentTarget);
    const amountValue = Number(formData.get("amount") || 0);
    const selectedAmountCurrency = formData.get("amount-currency") as Currency;
    const selectedCommissionCurrency = formData.get(
      "commission-currency",
    ) as Currency;
    const selectedMode = formData.get("commission-mode") as CommissionMode;

    const amountSar = amountValue / ratesPerSar[selectedAmountCurrency];

    const fee =
      amountSar > 1000
        ? amountSar * 0.03 * ratesPerSar[selectedCommissionCurrency]
        : fixedCommission[selectedCommissionCurrency];

    const feeInAmountCurrency =
      (fee / ratesPerSar[selectedCommissionCurrency]) *
      ratesPerSar[selectedAmountCurrency];

    if (selectedMode === "deduct" && feeInAmountCurrency >= amountValue) {
      setFormError(
        "قيمة الحوالة لا تكفي بعد خصم العمولة. ارفع المبلغ أو اختر إضافة العمولة.",
      );
      return;
    }

    const frontFile = formData.get("sender-front-image");
    const backFile = formData.get("sender-back-image");

    if (!(frontFile instanceof File) || !(backFile instanceof File)) {
      setFormError("أرفق صورة الوجه الأمامي والخلفي لبطاقة المرسل.");
      return;
    }

    let frontImage: string;
    let backImage: string;

    try {
      [frontImage, backImage] = await Promise.all([
        imageFileToDataUrl(frontFile),
        imageFileToDataUrl(backFile),
      ]);
    } catch {
      setFormError("تعذر قراءة صور البطاقة. اختر الصور مرة أخرى.");
      return;
    }

    const value = (name: string) => String(formData.get(name) ?? "").trim();

    const record: TransferRecord = {
      sender: {
        firstName: value("sender-first-name"),
        secondName: value("sender-second-name"),
        surname: value("sender-surname"),
        city: value("sender-city"),
        address: value("sender-address"),
        phone: value("sender-phone"),
        note: value("sender-note"),
        id: value("sender-id"),
        frontImage,
        backImage,
      },
      receiver: {
        firstName: value("receiver-first-name"),
        secondName: value("receiver-second-name"),
        surname: value("receiver-surname"),
        address: value("receiver-address"),
        city: value("receiver-city"),
        phone: value("receiver-phone"),
        note: value("receiver-note"),
      },
      amount: amountValue,
      amountCurrency: selectedAmountCurrency,
      commissionCurrency: selectedCommissionCurrency,
      commissionMode: selectedMode,
      commission: fee,
      commissionInAmountCurrency: feeInAmountCurrency,
      receiverGets:
        selectedMode === "deduct"
          ? amountValue - feeInAmountCurrency
          : amountValue,
      senderPays:
        selectedMode === "add"
          ? amountValue + feeInAmountCurrency
          : amountValue,
      sentDate: new Date().toLocaleDateString("ar-SA"),
    };

    setReviewData(record);
  }

  function confirmSend() {
    if (!reviewData) return;

    const savedTransfers = readStoredTransfers();
    let transferNumber = generateTransferNumber();
    while (
      savedTransfers.some((item) => item.transferNumber === transferNumber)
    ) {
      transferNumber = generateTransferNumber();
    }

    const transfer: StoredTransfer = { ...reviewData, transferNumber };
    const saved = saveTransferToLocalStorage(transfer);

    setStorageWarning(
      saved
        ? ""
        : "تم إنشاء الفاتورة، لكن تعذر حفظ الحوالة في التخزين المحلي للمتصفح.",
    );
    setSentData(transfer);
    setReviewData(null);
  }

  function startNewTransfer() {
    setSentData(null);
    setReviewData(null);
    setFormError("");
    setAmount("");
    setAmountCurrency("SAR");
    setCommissionCurrency("SAR");
    setCommissionMode("deduct");
    setSenderFrontPreview("");
    setSenderBackPreview("");
    setStorageWarning("");
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 print:bg-white print:p-0"
    >
      <style jsx global>{`
        @page {
          size: A5 landscape;
          margin: 7mm;
        }

        @media print {
          html,
          body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .print-invoice,
          .print-invoice * {
            visibility: visible !important;
          }

          .print-invoice {
            display: block !important;
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 134mm !important;
            max-width: none !important;
            margin: 0 !important;
            overflow: hidden !important;
            border-radius: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #111 !important;
            box-shadow: none !important;
            font-family: Arial, sans-serif !important;
            font-size: 9pt !important;
            box-sizing: border-box !important;
          }

          .print-invoice h1 {
            font-size: 16pt !important;
          }

          .print-invoice h2 {
            font-size: 10pt !important;
          }

          .print-invoice p {
            line-height: 1.35 !important;
          }
        }
      `}</style>

      {!sentData && (
        <form
          onSubmit={handleReview}
          className="mx-auto max-w-6xl space-y-3 print:hidden"
        >
          <header className="mb-3">
            <h1 className="text-lg font-bold text-slate-900">إرسال حوالة</h1>
            <p className="mt-1 text-[13px] text-slate-600">
              أدخل بيانات الحوالة والمرسل والمستلم، ثم راجعها قبل الإرسال.
            </p>
          </header>

          <Section title="مبلغ الحوالة والعمولة" icon="💳">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="amount"
                  className="text-[11px] leading-4 text-slate-600"
                >
                  مبلغ الحوالة
                </label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="any"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="أدخل المبلغ"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="amount-currency"
                  className="text-[11px] leading-4 text-slate-600"
                >
                  عملة الحوالة
                </label>
                <select
                  id="amount-currency"
                  name="amount-currency"
                  value={amountCurrency}
                  onChange={(event) => {
                    const value = event.target.value as Currency;
                    setAmountCurrency(value);
                    setCommissionCurrency(value);
                  }}
                  className={inputClass}
                >
                  <option value="YER">ريال يمني</option>
                  <option value="SAR">ريال سعودي</option>
                  <option value="USD">دولار أمريكي</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="commission-currency"
                  className="text-[11px] leading-4 text-slate-600"
                >
                  عملة العمولة
                </label>
                <select
                  id="commission-currency"
                  name="commission-currency"
                  value={commissionCurrency}
                  onChange={(event) =>
                    setCommissionCurrency(event.target.value as Currency)
                  }
                  className={inputClass}
                >
                  <option value="YER">ريال يمني</option>
                  <option value="SAR">ريال سعودي</option>
                  <option value="USD">دولار أمريكي</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="commission-mode"
                  className="text-[11px] leading-4 text-slate-600"
                >
                  طريقة احتساب العمولة
                </label>
                <select
                  id="commission-mode"
                  name="commission-mode"
                  value={commissionMode}
                  onChange={(event) =>
                    setCommissionMode(event.target.value as CommissionMode)
                  }
                  className={inputClass}
                >
                  <option value="deduct">تُخصم من مبلغ الحوالة</option>
                  <option value="add">تُضاف على المبلغ ويدفعها المرسل</option>
                </select>
              </div>
            </div>

            <div className="mt-3 grid gap-2 rounded-md bg-blue-50 p-3 text-sm sm:grid-cols-3">
              <p>
                العمولة:{" "}
                <strong>
                  {formatMoney(commission)} {currencyLabels[commissionCurrency]}
                </strong>
              </p>
              <p>
                المبلغ الذي يستلمه المستفيد:{" "}
                <strong>
                  {formatMoney(receiverGets)} {currencyLabels[amountCurrency]}
                </strong>
              </p>
              <p>
                إجمالي ما يدفعه المرسل:{" "}
                <strong>
                  {formatMoney(senderPays)} {currencyLabels[amountCurrency]}
                </strong>
              </p>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              العمولة ثابتة للمبالغ التي لا تتجاوز ما يعادل 1000 ريال سعودي،
              وبعدها تُحسب بنسبة 3%.
            </p>
          </Section>

          <div className="grid items-start gap-3 lg:grid-cols-2">
            <Section title="تفاصيل المرسل" icon="👤">
              <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                <NameFields prefix="sender" />

                <Field
                  id="sender-city"
                  label="المدينة"
                  placeholder="المدينة"
                  required
                />
                <Field
                  id="sender-address"
                  label="العنوان"
                  placeholder="عنوان المرسل"
                  required
                />
                <Field
                  id="sender-phone"
                  label="رقم الهاتف"
                  placeholder="رقم الهاتف"
                  type="tel"
                  required
                />

                <div className="col-span-3">
                  <Field
                    id="sender-note"
                    label="ملاحظة"
                    placeholder="ملاحظة اختيارية"
                  />
                </div>

                <div className="col-span-3">
                  <Field
                    id="sender-id"
                    label="رقم بطاقة / هوية المرسل"
                    placeholder="أدخل رقم بطاقة المرسل"
                    required
                  />
                </div>

                <div className="col-span-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="sender-front-image"
                      className="text-[11px] leading-4 text-slate-600"
                    >
                      صورة البطاقة — الوجه الأمامي
                    </label>
                    <input
                      id="sender-front-image"
                      name="sender-front-image"
                      type="file"
                      accept="image/*"
                      required
                      onChange={(event) =>
                        readImageFile(event, setSenderFrontPreview)
                      }
                      className={`${inputClass} h-auto py-2 file:ml-2 file:rounded file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-blue-700`}
                    />
                    {senderFrontPreview && (
                      <img
                        src={senderFrontPreview}
                        alt="معاينة الوجه الأمامي لبطاقة المرسل"
                        className="mt-2 h-24 w-full rounded border object-contain"
                      />
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="sender-back-image"
                      className="text-[11px] leading-4 text-slate-600"
                    >
                      صورة البطاقة — الوجه الخلفي
                    </label>
                    <input
                      id="sender-back-image"
                      name="sender-back-image"
                      type="file"
                      accept="image/*"
                      required
                      onChange={(event) =>
                        readImageFile(event, setSenderBackPreview)
                      }
                      className={`${inputClass} h-auto py-2 file:ml-2 file:rounded file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-blue-700`}
                    />
                    {senderBackPreview && (
                      <img
                        src={senderBackPreview}
                        alt="معاينة الوجه الخلفي لبطاقة المرسل"
                        className="mt-2 h-24 w-full rounded border object-contain"
                      />
                    )}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="تفاصيل المستلم" icon="🪪">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
                <NameFields prefix="receiver" />

                <Field
                  id="receiver-address"
                  label="العنوان"
                  placeholder="عنوان المستلم"
                  required
                />
                <Field
                  id="receiver-city"
                  label="المدينة"
                  placeholder="المدينة"
                  required
                />
                <Field
                  id="receiver-phone"
                  label="رقم الهاتف"
                  placeholder="رقم الهاتف"
                  type="tel"
                  required
                />

                <div className="col-span-2 sm:col-span-3">
                  <Field
                    id="receiver-note"
                    label="ملاحظة للمستلم"
                    placeholder="ملاحظة اختيارية"
                  />
                </div>
              </div>
            </Section>
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-md bg-red-50 p-3 text-sm text-red-700"
            >
              {formError}
            </p>
          )}

          <button
            type="submit"
            className="h-11 w-full rounded-lg bg-gradient-to-l from-sky-700 to-blue-800 text-sm font-semibold text-white shadow-sm hover:from-sky-800 hover:to-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            مراجعة وإرسال الحوالة
          </button>
        </form>
      )}

      {reviewData && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 print:hidden">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-title"
            className="my-auto w-full max-w-2xl rounded-xl bg-white p-5 shadow-2xl"
          >
            <h2 id="review-title" className="text-lg font-bold text-slate-900">
              تأكد من البيانات
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              راجع بيانات الحوالة والعمولة. بعد التأكد اضغط على «إرسال الحوالة».
            </p>

            <div className="mt-4 grid gap-3 rounded-lg border border-slate-200 p-4 text-sm sm:grid-cols-2">
              <p>
                المرسل: <strong>{fullName(reviewData.sender)}</strong>
              </p>
              <p>
                بطاقة المرسل: <strong>{reviewData.sender.id}</strong>
              </p>
              <p>
                المستلم: <strong>{fullName(reviewData.receiver)}</strong>
              </p>
              <p>
                هاتف المستلم: <strong>{reviewData.receiver.phone}</strong>
              </p>
              <p>
                مبلغ الحوالة:{" "}
                <strong>
                  {formatMoney(reviewData.amount)}{" "}
                  {currencyLabels[reviewData.amountCurrency]}
                </strong>
              </p>
              <p>
                العمولة:{" "}
                <strong>
                  {formatMoney(reviewData.commission)}{" "}
                  {currencyLabels[reviewData.commissionCurrency]}
                </strong>
              </p>
              <p>
                يستلم المستفيد:{" "}
                <strong>
                  {formatMoney(reviewData.receiverGets)}{" "}
                  {currencyLabels[reviewData.amountCurrency]}
                </strong>
              </p>
              <p>
                يدفع المرسل:{" "}
                <strong>
                  {formatMoney(reviewData.senderPays)}{" "}
                  {currencyLabels[reviewData.amountCurrency]}
                </strong>
              </p>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setReviewData(null)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                رجوع للتعديل
              </button>
              <button
                type="button"
                onClick={confirmSend}
                className="flex-1 rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white"
              >
                تأكيد وإرسال الحوالة
              </button>
            </div>
          </section>
        </div>
      )}

      {sentData && (
        <>
          <div className="mx-auto mb-3 flex max-w-5xl flex-wrap items-center gap-2 print:hidden">
            <p className="mb-2 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-800">
              تم إرسال الحوالة بنجاح.
            </p>
            {storageWarning && (
              <p
                role="alert"
                className="mb-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
              >
                {storageWarning}
              </p>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white"
            >
              طباعة الفاتورة
            </button>
            <button
              type="button"
              onClick={startNewTransfer}
              className="mr-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              إغلاق السند والعودة إلى إرسال حوالة جديدة
            </button>
          </div>

          <article
            className="print-invoice mx-auto mt-3 w-full max-w-5xl rounded-lg bg-white p-4 text-slate-900 shadow"
            dir="rtl"
            aria-label="فاتورة إرسال حوالة"
          >
            <header className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
              <div>
                <Image src={invoiceLogo} alt="بنك التضامن" width={100} />
              </div>
              <h1 className="text-3xl font-bold">إشعار إرسال حوالة</h1>
              <h2 className="font-bold">
                رقم الحوالة: <span dir="ltr">{sentData.transferNumber}</span>
              </h2>
              <span className="text-sm text-slate-500">
                {sentData.sentDate}
              </span>
            </header>

            <div className="flex gap-2">
              <div className="w-1/2">
                <div className="flex flex-col gap-2">
                  <section className="min-h-[38mm] rounded border border-slate-500 p-2">
                    <h2 className="mb-1 border-b border-slate-300 pb-1 text-[11pt] font-bold text-blue-900">
                      معلومات المرسل والمبلغ المرسل
                    </h2>
                    <p className="my-[3px]">
                      اسم المرسل:{" "}
                      <strong>{fullName(sentData.sender) || "—"}</strong>
                    </p>
                    <p className="my-[3px]">
                      رقم هاتف المرسل:{" "}
                      <strong>{sentData.sender.phone || "—"}</strong>
                    </p>
                    <p className="my-[3px]">
                      رقم هوية المرسل:{" "}
                      <strong>{sentData.sender.id || "—"}</strong>
                    </p>
                    <p className="my-[3px]">
                      المبلغ المرسل:{" "}
                      <strong>
                        {formatMoney(sentData.amount)}{" "}
                        {currencyLabels[sentData.amountCurrency]}
                      </strong>
                    </p>
                    <p className="my-[3px]">
                      العمولة:{" "}
                      <strong>
                        {formatMoney(sentData.commission)}{" "}
                        {currencyLabels[sentData.commissionCurrency]}
                      </strong>
                    </p>
                    <p className="my-[3px]">
                      إجمالي ما دفعه المرسل:{" "}
                      <strong>
                        {formatMoney(sentData.senderPays)}{" "}
                        {currencyLabels[sentData.amountCurrency]}
                      </strong>
                    </p>
                  </section>

                  <section className="min-h-[38mm] rounded border border-slate-500 p-2">
                    <h2 className="mb-1 border-b border-slate-300 pb-1 text-[11pt] font-bold text-blue-900">
                      معلومات المستلم والمبلغ المستحق
                    </h2>
                    <p className="my-[3px]">
                      الاسم:{" "}
                      <strong>{fullName(sentData.receiver) || "—"}</strong>
                    </p>
                    <p className="my-[3px]">
                      العنوان:{" "}
                      <strong>
                        {sentData.receiver.address || "—"}،{" "}
                        {sentData.receiver.city || "—"}
                      </strong>
                    </p>
                    <p className="my-[3px]">
                      رقم الهاتف:{" "}
                      <strong>{sentData.receiver.phone || "—"}</strong>
                    </p>
                    <p className="my-[3px]">
                      المبلغ المستحق للمستلم:{" "}
                      <strong>
                        {formatMoney(sentData.receiverGets)}{" "}
                        {currencyLabels[sentData.amountCurrency]}
                      </strong>
                    </p>
                    {sentData.sender.note && (
                      <p className="my-[3px]">
                        ملاحظة المرسل: <strong>{sentData.sender.note}</strong>
                      </p>
                    )}
                    {sentData.receiver.note && (
                      <p className="my-[3px]">
                        ملاحظة للمستلم:{" "}
                        <strong>{sentData.receiver.note}</strong>
                      </p>
                    )}
                  </section>
                </div>
              </div>

              <div className="w-1/2">
                <div className="flex flex-col gap-2">
                  <section className="h-[43mm] shrink-0 overflow-hidden rounded border border-slate-500 p-1">
                    <h2 className="mb-1 text-[10pt] font-bold text-blue-900">
                      الوجه الأمامي لبطاقة المرسل
                    </h2>
                    {sentData.sender.frontImage ? (
                      <img
                        src={sentData.sender.frontImage}
                        alt="الوجه الأمامي لبطاقة المرسل"
                        className="h-[34mm] w-full object-contain"
                      />
                    ) : (
                      <div className="grid h-[34mm] place-items-center text-sm text-slate-500">
                        لم تُرفق صورة الوجه الأمامي
                      </div>
                    )}
                  </section>

                  <section className="h-[43mm] shrink-0 overflow-hidden rounded border border-slate-500 p-1">
                    <h2 className="mb-1 text-[10pt] font-bold text-blue-900">
                      الوجه الخلفي لبطاقة المرسل
                    </h2>
                    {sentData.sender.backImage ? (
                      <img
                        src={sentData.sender.backImage}
                        alt="الوجه الخلفي لبطاقة المرسل"
                        className="h-[34mm] w-full object-contain"
                      />
                    ) : (
                      <div className="grid h-[34mm] place-items-center text-sm text-slate-500">
                        لم تُرفق صورة الوجه الخلفي
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>

            <footer className="mx-10 mt-3 flex justify-between gap-8 text-center">
              <div>
                <p>اسم المرسل: {fullName(sentData.sender) || "—"}</p>
                <p className="mt-2">
                  هاتف المرسل: {sentData.sender.phone || "—"}
                </p>
                <p className="mt-2">توقيع المرسل: ____________________</p>
              </div>

              <div className="min-w-40  p-3">
                ختم الوكيل
                <br />
                ____________
              </div>
            </footer>
          </article>
        </>
      )}
    </main>
  );
}
