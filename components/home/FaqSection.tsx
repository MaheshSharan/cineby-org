import { useMemo } from "react";
import { Accordion } from "@/components/ui/Accordion";
import { HOME_FAQ_ITEMS } from "@/lib/seo/faqSchema";

export function FaqSection() {
  const { leftCol, rightCol } = useMemo(() => {
    const half = Math.ceil(HOME_FAQ_ITEMS.length / 2);
    return {
      leftCol: HOME_FAQ_ITEMS.slice(0, half).map((item, i) => ({ item, index: i })),
      rightCol: HOME_FAQ_ITEMS.slice(half).map((item, i) => ({ item, index: half + i })),
    };
  }, []);

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start w-full max-w-full">
        {/* Left Column */}
        <Accordion variant="separated" selectionMode="single" className="w-full max-w-full">
          {leftCol.map(({ item, index }) => (
            <Accordion.Item key={index} value={`faq-${index}`} className="w-full max-w-full overflow-hidden">
              <Accordion.Trigger className="px-4 sm:px-5 py-4 sm:py-4.5 w-full text-left">
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

        {/* Right Column */}
        <Accordion variant="separated" selectionMode="single" className="w-full max-w-full">
          {rightCol.map(({ item, index }) => (
            <Accordion.Item key={index} value={`faq-${index}`} className="w-full max-w-full overflow-hidden">
              <Accordion.Trigger className="px-4 sm:px-5 py-4 sm:py-4.5 w-full text-left">
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
      </div>
    </section>
  );
}
