export const money = (n:number) => new Intl.NumberFormat('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number.isFinite(n)?n:0);
const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function under100(n:number){return n<20?ones[n]:tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'')}
function words(n:number):string{n=Math.floor(n);if(n===0)return 'Zero';if(n<100)return under100(n);if(n<1000)return ones[Math.floor(n/100)]+' Hundred'+(n%100?' '+under100(n%100):'');if(n<100000)return words(Math.floor(n/1000))+' Thousand'+(n%1000?' '+words(n%1000):'');if(n<10000000)return words(Math.floor(n/100000))+' Lakh'+(n%100000?' '+words(n%100000):'');return words(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+words(n%10000000):'')}
export const amountInWords=(n:number)=>`INR ${words(Math.round(n))} Only`;
/** Safely formats dates coming from invoice forms, Google Sheets and receipt history. */
export const dateDisplay = (value: string | Date | null | undefined): string => {
  if (value == null || value === '') return '';

  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else {
    const input = String(value).trim();
    if (!input) return '';

    // Treat an ISO date-only value as a local calendar date. Do not append
    // T00:00:00 to values that already contain a time or timezone.
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    const slashDate = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(input);

    if (isoDate) {
      date = new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
      if (
        date.getFullYear() !== Number(isoDate[1]) ||
        date.getMonth() !== Number(isoDate[2]) - 1 ||
        date.getDate() !== Number(isoDate[3])
      ) return '—';
    } else if (slashDate) {
      // Common Indian date format: DD/MM/YYYY or DD-MM-YYYY.
      date = new Date(Number(slashDate[3]), Number(slashDate[2]) - 1, Number(slashDate[1]));
      if (
        date.getFullYear() !== Number(slashDate[3]) ||
        date.getMonth() !== Number(slashDate[2]) - 1 ||
        date.getDate() !== Number(slashDate[1])
      ) return '—';
    } else {
      date = new Date(input);
    }
  }

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};
