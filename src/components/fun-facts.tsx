/**
 * Fun facts cards about Ms. Lilly's life
 * Three themed cards: The Warden, Biscuit Dance, Garden Crimes
 */
export default function FunFacts() {
  const facts = [
    {
      title: "The Warden",
      emoji: "👮",
      description: "That's what I call my human. I've trained her well - she knows when to open the treat cabinet and when to say 'hey heys' (though I usually ignore those).",
      color: "bg-[#FB7185]",
      borderColor: "border-[#FB7185]",
    },
    {
      title: "The Biscuit Dance",
      emoji: "💃",
      description: "My signature move! When treats are involved, I perform a spectacular dance that includes yanking, dragging, and barking. It's quite the performance!",
      color: "bg-[#F59E0B]",
      borderColor: "border-[#F59E0B]",
    },
    {
      title: "Garden Crimes",
      emoji: "🌱",
      description: "I'm an expert digger. When security shows up, I just walk away and try not to make eye contact. Sometimes you gotta dig deeper!",
      color: "bg-[#10B981]",
      borderColor: "border-[#10B981]",
    },
  ];

  return (
    <section className="py-16 sm:py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-[#78350F] mb-12">
          A Few Things About Me
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {facts.map((fact, index) => (
            <div
              key={fact.title}
              className="group relative bg-[#FEF3C7] rounded-2xl p-6 border-4 border-transparent hover:border-[#F59E0B] transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-default"
            >
              {/* Decorative corner paw */}
              <div className="absolute top-2 right-2 text-3xl opacity-10 group-hover:opacity-20 transition-opacity">
                🐾
              </div>
              
              <div className="text-5xl mb-4">{fact.emoji}</div>
              
              <h3 className="text-xl font-bold text-[#78350F] mb-3">
                {fact.title}
              </h3>
              
              <p className="text-[#92400E] leading-relaxed">
                {fact.description}
              </p>
              
              {/* Bottom accent line */}
              <div className={`mt-4 h-1 ${fact.color} rounded-full w-16`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}