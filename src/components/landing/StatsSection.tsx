const stats = [
  { value: '50+', label: 'AI-first businesses' },
  { value: '1,043+', label: 'Hours saved' },
  { value: '97.4%', label: 'Brand consistency' },
  { value: '2,460+', label: 'Content Generated' },
];

const StatsSection = () => {
  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-4xl font-bold md:text-5xl">{stat.value}</p>
              <p className="mt-2 text-primary-foreground/80">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
