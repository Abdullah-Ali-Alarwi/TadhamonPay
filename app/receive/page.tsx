"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import invoiceLogo from "@/public/invoiceLogo.jpg";
import Image from "next/image";
import idface from "@/public/id1.png";
import idback from "@/public/id2.png";

const savePeforCustomer = {
  id: "1",
  phone: "733123456",
  issuePlace: "الرياض",
  expiryDate: "2026-10-08",
  cardNumber: "123456789",
  photoFront: idface,
  photoBack: idback,
};

const demoTransfer = {
  number: "123456",
  sender: {
    name: "عبدالله علي احمد العروي",
    address: "الحي الزراعي",
    city: "الرياض",
    phone: "96655555555",
    note: "مصاريف عائلية",
  },
  amount: {
    number: "123456",
    sent: 1000,
    words: "ألف ريال سعودي فقط",
    currency: "ريال سعودي",
    date: "2026/10/08",
  },
  receiver: {
    name: "علي احمد علوي صالح العروي",
    address: "شارع الحي الزراعي",
    phone: "733123456",
    id: "123456789",
  },
};

const emptyTransfer = {
  number: "",
  sender: { name: "", address: "", city: "", phone: "", note: "" },
  amount: {
    number: "",
    sent: "",
    words: "",
    currency: "",
    date: "",
  },
  receiver: { name: "", address: "", phone: "", id: "" },
};

type CurrencyCode = "SAR" | "YER" | "USD";

// قيمة العملة الناتجة مقابل وحدة واحدة من العملة المرسلة.
const exchangeRates: Record<
  CurrencyCode,
  Partial<Record<CurrencyCode, number>>
> = {
  SAR: { YER: 140, USD: 3.7 },
  YER: { SAR: 1 / 140, USD: 1 / 530 },
  USD: { SAR: 1 / 3.7, YER: 530 },
};

type SentTransfer = {
  transferNumber: string;
  sender: {
    firstName: string;
    secondName: string;
    surname: string;
    address: string;
    city: string;
    phone: string;
    note: string;
    id: string;
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
  amountCurrency: "SAR" | "YER" | "USD";
  commission?: number;
  commissionCurrency?: "SAR" | "YER" | "USD";
  sentDate: string;
  receivedAmount?: number;
  status?: "sent" | "partial" | "received";
};

type PayoutReceipt = {
  sourceAmountPaid: number;
  paidAmount: number;
  paidCurrency: CurrencyCode;
  exchanged: boolean;
  rate?: number;
};

const transferCurrencyNames = {
  SAR: "ريال سعودي",
  YER: "ريال يمني",
  USD: "دولار أمريكي",
} as const;

const transfersStorageKey = "remittance-transfers";
const customersStorageKey = "remittance-customers";

type CustomerProfile = {
  cardNumber: string;
  phone: string;
  issuePlace: string;
  expiryDate: string;
  photoFront: string;
  photoBack: string;
};

function normalizeCardNumber(value: string) {
  return value.replace(/\s+/g, "").trim().toLowerCase();
}

function compressImageForStorage(source: string): Promise<string> {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => {
      const maxSide = 1000;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(source);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    image.onerror = () => resolve(source);
    image.src = source;
  });
}

const inputClass =
  "mt-0.5 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function loadPreview(
  file: File | undefined,
  setPreview: (value: string | null) => void,
) {
  if (!file) {
    setPreview(null);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    setPreview(typeof reader.result === "string" ? reader.result : null);
  };
  reader.readAsDataURL(file);
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 flex-1 basis-32">
      <p className="text-[11px] leading-4 text-slate-500">{label}</p>
      <p className="mt-0.5 min-h-5 break-words text-[13px] font-semibold leading-5 text-slate-800">
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-lg border border-slate-200 bg-white p-2 shadow-sm ${className}`}
    >
      <h2 className="mb-1 flex items-center gap-2 border-b border-slate-100 pb-1 text-sm font-bold text-slate-900">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-base text-blue-700">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ReceivePage() {
  const [showIdModal, setShowIdModal] = useState(false);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [scannerType, setScannerType] = useState("flatbed");

  const [transferNumber, setTransferNumber] = useState("");
  const [transfer, setTransfer] = useState<typeof demoTransfer | null>(null);
  const [matchedTransfer, setMatchedTransfer] = useState<SentTransfer | null>(
    null,
  );
  const [notFound, setNotFound] = useState(false);
  const [receiveMessage, setReceiveMessage] = useState("");
  const [hasReceivedInCurrentSession, setHasReceivedInCurrentSession] =
    useState(false);
  const [lastPayout, setLastPayout] = useState<PayoutReceipt | null>(null);
  const [receivedSoFar, setReceivedSoFar] = useState(0);
  const [exchangeAmount, setExchangeAmount] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("YER");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [issuePlace, setIssuePlace] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [customerFound, setCustomerFound] = useState(false);

  useEffect(() => {
    const sampleCustomer: CustomerProfile = {
      cardNumber: savePeforCustomer.cardNumber,
      phone: savePeforCustomer.phone,
      issuePlace: savePeforCustomer.issuePlace,
      expiryDate: savePeforCustomer.expiryDate,
      photoFront: savePeforCustomer.photoFront.src,
      photoBack: savePeforCustomer.photoBack.src,
    };

    try {
      const parsed: unknown = JSON.parse(
        localStorage.getItem(customersStorageKey) || "[]",
      );
      const existing = Array.isArray(parsed)
        ? (parsed as CustomerProfile[])
        : [];
      const alreadySaved = existing.some(
        (customer) =>
          normalizeCardNumber(customer.cardNumber || "") ===
          normalizeCardNumber(sampleCustomer.cardNumber),
      );

      if (!alreadySaved) {
        localStorage.setItem(
          customersStorageKey,
          JSON.stringify([sampleCustomer, ...existing]),
        );
      }
    } catch {
      // يبقى التحقق من السجل التجريبي متاحًا عبر البيانات المضمنة في الصفحة.
    }
  }, []);

  const data = transfer ?? emptyTransfer;
  const sourceCurrency: CurrencyCode = matchedTransfer?.amountCurrency ?? "SAR";
  const exchangeRate = exchangeRates[sourceCurrency][currency];
  const sameCurrency = Boolean(
    matchedTransfer && exchangeAmount && sourceCurrency === currency,
  );
  const sentAmount = Number(data.amount.sent || 0);
  const amountToExchange = Number(exchangeAmount || 0);
  const availableAmount = Math.max(0, sentAmount - receivedSoFar);
  const remainingAmount = Math.max(0, availableAmount - amountToExchange);
  const convertedAmount = amountToExchange * Number(exchangeRate || 0);

  function findTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotFound(false);
    setReceiveMessage("");
    setExchangeAmount("");
    setTransfer(null);
    setMatchedTransfer(null);
    setHasReceivedInCurrentSession(false);
    setLastPayout(null);

    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(transfersStorageKey) || "[]",
      );
      const records = Array.isArray(saved) ? (saved as SentTransfer[]) : [];
      const wanted = transferNumber.trim().toUpperCase();
      const found = records.find(
        (item) => item.transferNumber?.trim().toUpperCase() === wanted,
      );

      if (found) {
        const senderName = [
          found.sender.firstName,
          found.sender.secondName,
          found.sender.surname,
        ]
          .filter(Boolean)
          .join(" ");
        const receiverName = [
          found.receiver.firstName,
          found.receiver.secondName,
          found.receiver.surname,
        ]
          .filter(Boolean)
          .join(" ");

        setMatchedTransfer(found);
        setCurrency(found.amountCurrency === "YER" ? "SAR" : "YER");
        setReceivedSoFar(Number(found.receivedAmount || 0));
        setTransfer({
          number: found.transferNumber,
          sender: {
            name: senderName,
            address: found.sender.address || "",
            city: found.sender.city || "",
            phone: found.sender.phone || "",
            note: found.sender.note || "",
          },
          amount: {
            number: found.transferNumber,
            sent: Number(found.amount || 0),
            words: "",
            currency: transferCurrencyNames[found.amountCurrency],
            date: found.sentDate || "",
          },
          receiver: {
            name: receiverName,
            address: found.receiver.address || "",
            phone: found.receiver.phone || "",
            id: "",
          },
        });
        setRecipientPhone(found.receiver.phone || "");
        setNotFound(false);
        return;
      }
    } catch {
      // يعرض تنبيه عدم العثور إذا كانت بيانات التخزين غير قابلة للقراءة.
    }

    setReceivedSoFar(0);
    setRecipientPhone("");
    setNotFound(true);
  }

  function verifyCustomer() {
    const wantedCard = normalizeCardNumber(cardNumber);
    setCustomerMessage("");
    setCustomerFound(false);

    if (!wantedCard) {
      setCustomerMessage("أدخل رقم البطاقة أولًا ثم اضغط على تحقق.");
      return;
    }

    let savedCustomers: CustomerProfile[] = [];
    try {
      const parsed: unknown = JSON.parse(
        localStorage.getItem(customersStorageKey) || "[]",
      );
      if (Array.isArray(parsed)) savedCustomers = parsed as CustomerProfile[];
    } catch {
      savedCustomers = [];
    }

    const storedCustomer = savedCustomers.find(
      (item) => normalizeCardNumber(item.cardNumber || "") === wantedCard,
    );

    // سجل تجريبي موجود أعلى الملف، مع إمكانية التحقق منه كذلك.
    const sampleCustomer: CustomerProfile | null =
      normalizeCardNumber(savePeforCustomer.cardNumber) === wantedCard
        ? {
            cardNumber: savePeforCustomer.cardNumber,
            phone: savePeforCustomer.phone,
            issuePlace: savePeforCustomer.issuePlace,
            expiryDate: savePeforCustomer.expiryDate,
            photoFront: savePeforCustomer.photoFront.src,
            photoBack: savePeforCustomer.photoBack.src,
          }
        : null;

    const customer = storedCustomer || sampleCustomer;
    if (customer) {
      setCardNumber(customer.cardNumber);
      setRecipientPhone(customer.phone);
      setIssuePlace(customer.issuePlace);
      setExpiryDate(customer.expiryDate);
      setFrontPreview(customer.photoFront || null);
      setBackPreview(customer.photoBack || null);
      setCustomerFound(true);
      setCustomerMessage("تم العثور على بيانات العميل وتعبئتها تلقائيًا.");
      return;
    }

    setRecipientPhone("");
    setIssuePlace("");
    setExpiryDate("");
    setFrontPreview(null);
    setBackPreview(null);
    setCustomerMessage(
      "لا توجد بيانات محفوظة لهذا العميل. أدخل بياناته وأرفق صور البطاقة.",
    );
  }

  async function saveCustomerProfile() {
    if (!cardNumber.trim() || !frontPreview || !backPreview) return false;

    const [photoFront, photoBack] = await Promise.all([
      compressImageForStorage(frontPreview),
      compressImageForStorage(backPreview),
    ]);

    const customer: CustomerProfile = {
      cardNumber: cardNumber.trim(),
      phone: recipientPhone.trim(),
      issuePlace: issuePlace.trim(),
      expiryDate,
      photoFront,
      photoBack,
    };

    try {
      const parsed: unknown = JSON.parse(
        localStorage.getItem(customersStorageKey) || "[]",
      );
      const existing = Array.isArray(parsed)
        ? (parsed as CustomerProfile[])
        : [];
      const updated = [
        customer,
        ...existing.filter(
          (item) =>
            normalizeCardNumber(item.cardNumber || "") !==
            normalizeCardNumber(customer.cardNumber),
        ),
      ];
      localStorage.setItem(customersStorageKey, JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  }

  async function receiveTransfer() {
    if (!matchedTransfer) return;

    const isExchange = Boolean(exchangeAmount.trim());
    if (isExchange && matchedTransfer.amountCurrency === currency) {
      setReceiveMessage(
        "خطأ: يجب أن تكون عملة الصرف مختلفة عن عملة الحوالة المرسلة.",
      );
      return;
    }

    const sourceAmountPaid = isExchange ? amountToExchange : availableAmount;
    if (
      sourceAmountPaid <= 0 ||
      (isExchange &&
        (!Number.isFinite(amountToExchange) ||
          amountToExchange <= 0 ||
          amountToExchange > availableAmount))
    ) {
      setReceiveMessage(
        "لا يوجد مبلغ متبقٍ للاستلام، أو أن مبلغ المصارفة المدخل غير صحيح.",
      );
      return;
    }
    if (
      !recipientPhone.trim() ||
      !cardNumber.trim() ||
      !frontPreview ||
      !backPreview
    ) {
      setReceiveMessage(
        "أكمل بيانات المستلم وأرفق وجهي البطاقة قبل صرف الحوالة.",
      );
      return;
    }

    try {
      const raw = localStorage.getItem(transfersStorageKey) || "[]";
      const saved = JSON.parse(raw) as SentTransfer[];
      const index = saved.findIndex(
        (item) => item.transferNumber === matchedTransfer.transferNumber,
      );
      if (index < 0) {
        setReceiveMessage(
          "لم تعد الحوالة موجودة في التخزين المحلي. أعد البحث عنها.",
        );
        return;
      }

      const current = saved[index];
      const newReceivedAmount =
        Number(current.receivedAmount || 0) + sourceAmountPaid;
      const updated: SentTransfer = {
        ...current,
        receivedAmount: newReceivedAmount,
        status:
          newReceivedAmount >= Number(current.amount) ? "received" : "partial",
      };
      saved[index] = updated;
      localStorage.setItem(transfersStorageKey, JSON.stringify(saved));
      const customerSaved = await saveCustomerProfile();
      setMatchedTransfer(updated);
      setReceivedSoFar(newReceivedAmount);
      setLastPayout({
        sourceAmountPaid,
        paidAmount: isExchange
          ? sourceAmountPaid * Number(exchangeRate || 0)
          : sourceAmountPaid,
        paidCurrency: isExchange ? currency : matchedTransfer.amountCurrency,
        exchanged: isExchange,
        rate: isExchange ? exchangeRate : undefined,
      });
      setExchangeAmount("");
      setHasReceivedInCurrentSession(true);
      setReceiveMessage(
        updated.status === "received"
          ? customerSaved
            ? "تم تسجيل استلام كامل الحوالة وحفظ بيانات العميل للمرات القادمة."
            : "تم تسجيل استلام كامل مبلغ الحوالة."
          : customerSaved
            ? "تم تسجيل الصرف الجزئي وحفظ بيانات العميل للمرات القادمة."
            : "تم تسجيل صرف جزء من الحوالة، ويمكن صرف المتبقي لاحقًا.",
      );
    } catch {
      setReceiveMessage("تعذر حفظ عملية الصرف في التخزين المحلي للمتصفح.");
    }
  }

  const remainingAmountLabel = data.amount.sent
    ? `${remainingAmount.toLocaleString()} ${data.amount.currency}`
    : "";

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 px-3 py-3 sm:px-4 lg:px-5 lg:py-2"
    >
      <div className="mx-auto max-w-[1500px]">
        <style jsx global>{`
          @page {
            size: A5 landscape;
            margin: 7mm;
          }
          @media screen {
            .print-invoice {
              display: none;
            }
          }
          @media print {
            html,
            body {
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
              position: absolute;
              inset: 0;
              width: 100%;
              color: #111;
              background: #fff;
              font-family: Arial, sans-serif;
              font-size: 9pt;
              box-sizing: border-box;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* البحث عن الحوالة */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <form
            onSubmit={findTransfer}
            className="flex w-full max-w-xs items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm"
          >
            <input
              value={transferNumber}
              onChange={(event) => setTransferNumber(event.target.value)}
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              placeholder="رقم الحوالة"
              aria-label="رقم الحوالة"
              className="h-8 min-w-0 flex-1 border-0 bg-transparent px-2 text-[13px] outline-none placeholder:text-slate-400 focus:ring-0"
              required
            />
            <button
              type="submit"
              className="h-8 shrink-0 rounded-md bg-blue-800 px-3 text-[13px] font-semibold text-white transition hover:bg-blue-900"
            >
              بحث
            </button>
          </form>
          <div className="no-print flex justify-start">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!hasReceivedInCurrentSession}
              className="rounded-lg bg-blue-800 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              طباعة الفاتورة
            </button>
          </div>
        </div>

        {/* تبقى البطاقات ظاهرة قبل البحث وبعده */}
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-start lg:gap-3">
          {/* يستخدم Flex لترتيب العمود الأيمن والأيسر */}
          <div className="contents">
            <Section
              title="معلومات الحوالة والمبلغ"
              icon="💳"
              className="order-1 w-full lg:w-[calc(50%-6px)]"
            >
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                <Detail label="رقم الحوالة" value={data.amount.number} />
                <Detail
                  label="المبلغ المرسل"
                  value={
                    data.amount.sent
                      ? `${sentAmount.toLocaleString()} ${data.amount.currency}`
                      : ""
                  }
                />
                <Detail label="المبلغ كتابةً" value={data.amount.words} />
                <Detail label="العملة" value={data.amount.currency} />
                <Detail label="تاريخ الإرسال" value={data.amount.date} />
              </div>
            </Section>

            <Section
              title="تفاصيل المرسل"
              icon="👤"
              className="order-3 w-full lg:w-[calc(50%-6px)]"
            >
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                <Detail label="اسم المرسل" value={data.sender.name} />
                <Detail label="العنوان" value={data.sender.address} />
                <Detail label="المدينة" value={data.sender.city} />
                <Detail label="رقم الهاتف" value={data.sender.phone} />
                <Detail label="ملاحظة" value={data.sender.note} />
              </div>

              <Section title="معلومات الصرف والدفع" icon="⇄" className="">
                <div className="flex  gap-x-3">
                  <div className="min-w-[calc(50%-6px)] flex-1">
                    <label
                      htmlFor="paid-sar"
                      className="text-[11px] leading-4 text-slate-500"
                    >
                      المبلغ المرسل بعملة الحوالة
                    </label>
                    <input
                      id="paid-sar"
                      value={data.amount.sent}
                      readOnly
                      placeholder="—"
                      className={inputClass}
                      disabled
                    />
                  </div>
                  <div className="">
                    <label
                      htmlFor="exchange-rate"
                      className="text-[11px] leading-4 text-slate-500"
                    >
                      سعر الصرف
                    </label>
                    <input
                      id="exchange-rate"
                      type="number"
                      min="0"
                      step="any"
                      value={exchangeRate}
                      readOnly
                      placeholder="أدخل سعر الصرف"
                      className={inputClass}
                      disabled
                    />
                  </div>

                  <div className="">
                    <label
                      htmlFor="exchange-amount"
                      className="text-[11px] leading-4 text-slate-500"
                    >
                      المبلغ المراد صرفه ({data.amount.currency})
                    </label>
                    <input
                      id="exchange-amount"
                      type="number"
                      min="0"
                      max={availableAmount || undefined}
                      step="any"
                      value={exchangeAmount}
                      onChange={(event) =>
                        setExchangeAmount(event.target.value)
                      }
                      placeholder="المتاح للصرف: "
                      className={inputClass}
                    />
                    <p className="mt-1 text-[10px] leading-4 text-slate-500">
                      اختياري: اترك الحقل فارغًا لاستلام كامل المتبقي بعملة
                      الحوالة دون مصارفة.
                    </p>
                  </div>
                </div>

                <div className="">
                  <label
                    htmlFor="currency"
                    className="text-[11px] leading-4 text-slate-500"
                  >
                    عملة الصرف
                  </label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(event) => {
                      const nextCurrency = event.target.value as CurrencyCode;
                      setCurrency(nextCurrency);
                      setReceiveMessage(
                        Boolean(exchangeAmount) &&
                          matchedTransfer?.amountCurrency === nextCurrency
                          ? "خطأ: يجب أن تكون عملة الصرف مختلفة عن عملة الحوالة المرسلة."
                          : "",
                      );
                    }}
                    className={inputClass}
                  >
                    <option value="YER">ريال يمني</option>
                    <option value="SAR">ريال سعودي</option>
                    <option value="USD">دولار أمريكي</option>
                  </select>
                  {sameCurrency && (
                    <p
                      role="alert"
                      className="mt-1 text-xs font-medium text-red-700"
                    >
                      خطأ: يجب أن تكون عملة الصرف مختلفة عن عملة الحوالة
                      المرسلة.
                    </p>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-2 rounded-md bg-blue-50 p-2">
                  <Detail
                    label="المتبقي من الحوالة بالعملة المرسلة"
                    value={remainingAmountLabel}
                  />
                  <Detail
                    label="المبلغ الذي سبق صرفه"
                    value={
                      receivedSoFar
                        ? `${receivedSoFar.toLocaleString()} ${data.amount.currency}`
                        : "0"
                    }
                  />
                  <Detail
                    label="المبلغ المصروف بالعملة المختارة"
                    value={
                      exchangeAmount && exchangeRate
                        ? `${convertedAmount.toLocaleString()} ${transferCurrencyNames[currency]}`
                        : transfer && availableAmount > 0
                          ? `استلام كامل المتبقي دون مصارفة: ${availableAmount.toLocaleString()} ${data.amount.currency}`
                          : ""
                    }
                  />
                </div>
              </Section>
            </Section>

            <Section
              title="تفاصيل المستلم"
              icon="🪪"
              className="order-2 w-full lg:w-[calc(50%-6px)]"
            >
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                <Detail label="اسم المستلم" value={data.receiver.name} />
                <Detail label="العنوان" value={data.receiver.address} />
                <Detail label="رقم الهاتف" value={data.receiver.phone} />
                <Detail label="رقم الهوية" value={data.receiver.id} />
              </div>
            </Section>

            <div className="contents">
              <Section
                title="بيانات المستلم للصرف"
                icon="▣"
                className="order-4 w-full lg:w-[calc(50%-6px)]"
              >
                <div className="flex flex-wrap gap-x-3 gap-y-2">
                  <div className="min-w-[calc(50%-6px)] flex-1">
                    <label
                      htmlFor="recipient-phone"
                      className="text-[11px] leading-4 text-slate-500"
                    >
                      رقم الهاتف
                    </label>
                    <input
                      id="recipient-phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="أدخل رقم الهاتف"
                      value={recipientPhone}
                      onChange={(event) =>
                        setRecipientPhone(event.target.value)
                      }
                      className={inputClass}
                    />
                  </div>

                  <div className="min-w-[calc(50%-6px)] flex-1">
                    <label
                      htmlFor="card-number"
                      className="text-[11px] leading-4 text-slate-500"
                    >
                      رقم البطاقة
                    </label>
                    <input
                      id="card-number"
                      type="text"
                      placeholder="أدخل رقم البطاقة"
                      value={cardNumber}
                      onChange={(event) => {
                        setCardNumber(event.target.value);
                        setCustomerFound(false);
                        setCustomerMessage("");
                      }}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={verifyCustomer}
                      className="mt-2 h-9 w-full rounded-md bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      تحقق من رقم البطاقة
                    </button>
                    {customerMessage && (
                      <p
                        role="status"
                        className={`mt-1 text-xs ${customerFound ? "text-green-700" : "text-amber-700"}`}
                      >
                        {customerMessage}
                      </p>
                    )}
                  </div>

                  <div className="min-w-[calc(50%-6px)] flex-1">
                    <label
                      htmlFor="issue-place"
                      className="text-[11px] leading-4 text-slate-500"
                    >
                      مكان الإصدار
                    </label>
                    <input
                      id="issue-place"
                      type="text"
                      placeholder="مكان إصدار البطاقة"
                      value={issuePlace}
                      onChange={(event) => setIssuePlace(event.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="min-w-[calc(50%-6px)] flex-1">
                    <label
                      htmlFor="expiry-date"
                      className="text-[11px] leading-4 text-slate-500"
                    >
                      تاريخ الانتهاء
                    </label>
                    <input
                      id="expiry-date"
                      type="date"
                      value={expiryDate}
                      onChange={(event) => setExpiryDate(event.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowIdModal(true)}
                  className="mt-3 w-full rounded-lg border border-blue-700 px-5 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
                >
                  {frontPreview && backPreview
                    ? "تعديل صور البطاقة الشخصية"
                    : "إضافة البطاقة الشخصية"}
                </button>

                <button
                  type="button"
                  disabled={
                    !transfer ||
                    !matchedTransfer ||
                    availableAmount <= 0 ||
                    (Boolean(exchangeAmount) &&
                      (amountToExchange <= 0 ||
                        amountToExchange > availableAmount)) ||
                    matchedTransfer?.status === "received"
                  }
                  onClick={receiveTransfer}
                  className="mt-2 h-10 w-full rounded-lg bg-gradient-to-l from-sky-700 to-blue-800 text-sm font-semibold text-white shadow-sm transition hover:from-sky-800 hover:to-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  صرف الحوالة
                </button>
                {receiveMessage && (
                  <p
                    role="status"
                    className="mt-2 rounded-md bg-blue-50 p-2 text-sm text-blue-800"
                  >
                    {receiveMessage}
                  </p>
                )}
              </Section>
            </div>
          </div>
        </div>
      </div>

      {/* قالب الطباعة */}
      <article
        className="print-invoice"
        dir="rtl"
        aria-label="فاتورة صرف حوالة"
      >
        <header className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
          <div>
            <Image src={invoiceLogo} alt="بنك التضامن" width={100} />
          </div>
          <h1 className="text-3xl font-bold">إشعار استلام حوالة</h1>
          <h2 className="font-bold">
            رقم الحوالة: <span dir="ltr">{data.number || "—"}</span>
          </h2>
          <span className="text-sm text-slate-500">
            {data.amount.date ? `  ${new Date().toLocaleDateString()}` : ""}
          </span>
        </header>

        <div className="flex gap-2 ">
          <div className="left w-[50%]">
            <div className="INFO">
              <section
                style={{
                  border: "1px solid #888",
                  borderRadius: "5px",
                  padding: "7px",
                  minHeight: "38mm",
                }}
              >
                <h2
                  style={{
                    fontSize: "11pt",
                    margin: "0 0 5px",
                    color: "#1e3a8a",
                    borderBottom: "1px solid #ddd",
                    paddingBottom: "3px",
                  }}
                >
                  معلومات المرسل والمبلغ المرسل
                </h2>
                <p style={{ margin: "3px 0" }}>
                  المبلغ المرسل:{" "}
                  <strong>
                    {data.amount.sent
                      ? `${sentAmount.toLocaleString()} ${data.amount.currency}`
                      : "—"}
                  </strong>
                </p>
                <p style={{ margin: "3px 0" }}>
                  المبلغ كتابةً: <strong>{data.amount.words || "—"}</strong>
                </p>
                <p style={{ margin: "3px 0" }}>
                  تاريخ الإرسال: <strong>{data.amount.date || "—"}</strong>
                </p>
                <p style={{ margin: "3px 0" }}>
                  اسم المرسل: <strong>{data.sender.name || "—"}</strong>
                </p>
              </section>

              <section
                style={{
                  border: "1px solid #888",
                  borderRadius: "5px",
                  padding: "7px",
                  minHeight: "38mm",
                }}
              >
                <h2
                  style={{
                    fontSize: "11pt",
                    margin: "0 0 5px",
                    color: "#1e3a8a",
                    borderBottom: "1px solid #ddd",
                    paddingBottom: "3px",
                  }}
                >
                  معلومات المستلم والبلغ المسلم
                </h2>
                <p style={{ margin: "3px 0" }}>
                  الاسم: <strong>{data.receiver.name || "—"}</strong>
                </p>
                <p style={{ margin: "3px 0" }}>
                  العنوان: <strong>{data.receiver.address || "—"}</strong>
                </p>
                <p style={{ margin: "3px 0" }}>
                  رقم الهاتف: <strong>{data.receiver.phone || "—"}</strong>
                </p>
                <p style={{ margin: "3px 0" }}>
                  رقم الهوية: <strong>{data.receiver.id || "—"}</strong>
                </p>

                <p style={{ margin: "3px 0" }}>
                  سعر الصرف:{" "}
                  <strong>
                    {lastPayout?.exchanged && lastPayout.rate
                      ? `1 ${transferCurrencyNames[sourceCurrency]} = ${lastPayout.rate} ${transferCurrencyNames[lastPayout.paidCurrency]}`
                      : "استلام دون مصارفة"}
                  </strong>
                </p>
                <p style={{ margin: "3px 0" }}>
                  المبلغ المصروف:{" "}
                  <strong>
                    {lastPayout
                      ? `${lastPayout.paidAmount.toLocaleString()} ${transferCurrencyNames[lastPayout.paidCurrency]}`
                      : "—"}
                  </strong>
                </p>
                <p style={{ margin: "3px 0" }}>
                  المتبقي: <strong>{remainingAmountLabel || "—"}</strong>
                </p>
              </section>
            </div>
          </div>
          <div className="right w-[50%] h-[50%]">
            <div className="ID flex flex-col gap-1">
              <section className="w-[330px] h-[165px] shrink-0 border p-2">
                {frontPreview ? (
                  <img
                    src={frontPreview}
                    alt="الوجه الأمامي للهوية"
                    className=" w-full object-contain"
                  />
                ) : (
                  <div>لم تُرفق صورة الوجه الأمامي</div>
                )}
              </section>

              <section className="w-[330px] h-[165px] shrink-0 border p-2">
                {backPreview ? (
                  <img
                    src={backPreview}
                    alt="الوجه الخلفي للهوية"
                    className="w-full h-full "
                  />
                ) : (
                  <div>لم تُرفق صورة الوجه الخلفي</div>
                )}
              </section>
            </div>
          </div>
        </div>
        <div className=" SIGNATIOR flex  text-center justify-between m-3 mx-10">
          <span>
            <p>الاسم :..........................................</p>
            <p>الهاتف :..........................................</p>
            <p>التوقيع :..........................................</p>
          </span>
          <span>
            ختم الوكيل
            <br />
            ____________
          </span>
        </div>
      </article>

      {/* نافذة عدم العثور على الحوالة */}
      {notFound && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
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
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-red-50 text-lg text-red-600">
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

      {/* نافذة إرفاق البطاقة الشخصية */}
      {showIdModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
          role="presentation"
          onClick={() => setShowIdModal(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="id-card-title"
            className="my-auto w-full max-w-4xl rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3">
              <h2
                id="id-card-title"
                className="text-base font-bold text-slate-900"
              >
                إرفاق البطاقة الشخصية
              </h2>
              <button
                type="button"
                onClick={() => setShowIdModal(false)}
                aria-label="إغلاق النافذة"
                className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-5 md:flex-row">
              {/* اختيار نوع الماسح واستيراد الصور */}
              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <label
                    htmlFor="scanner-type"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    نوع الماسح الضوئي
                  </label>
                  <select
                    id="scanner-type"
                    value={scannerType}
                    onChange={(event) => setScannerType(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="flatbed">ماسح مسطح</option>
                    <option value="adf">ماسح تلقائي للمستندات</option>
                    <option value="network">ماسح شبكي</option>
                  </select>
                </div>

                <p className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-900">
                  اختر نوع الماسح، ثم امسح وجهي البطاقة باستخدام برنامج الماسح
                  الضوئي واختر الصور الناتجة من الملفات أدناه.
                </p>

                <div>
                  <label
                    htmlFor="id-card-front"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    صورة البطاقة — الوجه الأمامي
                  </label>
                  <input
                    id="id-card-front"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      loadPreview(file, setFrontPreview);
                    }}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs file:ml-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-800"
                  />
                </div>

                <div>
                  <label
                    htmlFor="id-card-back"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    صورة البطاقة — الوجه الخلفي
                  </label>
                  <input
                    id="id-card-back"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      loadPreview(file, setBackPreview);
                    }}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs file:ml-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-800"
                  />
                </div>
              </div>

              {/* معاينة الوجهين */}
              <div className="flex gap-3">
                <div className="min-w-0 flex-1">
                  <p className="mb-2 text-xs font-semibold text-slate-700">
                    معاينة الوجه الأمامي
                  </p>
                  <div className="flex aspect-[1.6/1] items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                    {frontPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={frontPreview}
                        alt="معاينة الوجه الأمامي للبطاقة"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="px-2 text-center text-xs text-slate-400">
                        لم تُضف صورة الوجه الأمامي
                      </span>
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="mb-2 text-xs font-semibold text-slate-700">
                    معاينة الوجه الخلفي
                  </p>
                  <div className="flex aspect-[1.6/1] items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                    {backPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={backPreview}
                        alt="معاينة الوجه الخلفي للبطاقة"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="px-2 text-center text-xs text-slate-400">
                        لم تُضف صورة الوجه الخلفي
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIdModal(false)}
              className="mt-5 w-full rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-900"
            >
              حفظ وإغلاق
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
