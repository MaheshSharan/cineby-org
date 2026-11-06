import { Accordion } from "@/components/ui/Accordion";
import { HOME_FAQ_ITEMS } from "@/lib/seo/faqSchema";

export function FaqSection() {
  return (
    <section className="mt-8 sm:mt-12 w-full max-w-full overflow-hidden" aria-labelledby="faq-heading">
      <div className="flex flex-col items-center text-center mb-6 sm:mb-8 px-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-white/[0.14] to-white/[0.05] text-white/95 border border-white/20 backdrop-blur-md mb-3">
          Help & Information
        </span>
        <h2 id="faq-heading" className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white break-words">
          Frequently Asked Questions
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-white/50 max-w-lg break-words">
          Everything you need to know about streaming, watchlists, and playback on Cineby.
        </p>
      </div>

      {/* One list: a single column on mobile, two columns from md up */}
      <Accordion
        variant="separated"
        selectionMode="single"
        className="w-full max-w-full md:grid md:grid-cols-2 md:items-start md:gap-x-4 md:gap-y-3 md:space-y-0"
      >
        {HOME_FAQ_ITEMS.map((item, index) => (
          <Accordion.Item key={item.question} value={`faq-${index}`} className="w-full max-w-full overflow-hidden">
            <Accordion.Trigger className="px-4 sm:px-5 py-4 w-full text-left">
              <Accordion.Title className="text-sm sm:text-[15px] font-medium text-white/95 break-words [word-break:break-word]">
                {item.question}
              </Accordion.Title>
              <Accordion.Indicator />
            </Accordion.Trigger>
            <Accordion.Content className="px-4 sm:px-5 pb-5 pt-0 text-xs sm:text-sm text-white/60 leading-relaxed break-words [word-break:break-word] overflow-hidden">
              {item.answer}
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion>
    </section>
  );
}
