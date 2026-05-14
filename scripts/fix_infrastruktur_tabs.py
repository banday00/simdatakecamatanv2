import re

filepath = "src/app/data/infrastruktur/page.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# The broken block starts right after </header> and goes to </main>
# We replace lines 676-688 (the broken main content)

new_main = '''            <main className="px-6 max-w-7xl mx-auto -mt-16 relative z-20 pb-20 flex-1 w-full flex flex-col">
                {/* Section Tabs - 2x2 grid on mobile, single row on desktop */}
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-1 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm mb-8">
                    <button onClick={() => setActiveTab("sanitasi")} className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-3 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center border ${activeTab === "sanitasi" ? "bg-indigo-50 text-indigo-700 shadow-sm border-indigo-200 ring-1 ring-indigo-500/10" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
                        <Pipette className="w-4 h-4 flex-shrink-0" />
                        <span className="leading-tight">Sanitasi &amp; Lingkungan</span>
                    </button>
                    <button onClick={() => setActiveTab("pembangunan")} className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-3 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center border ${activeTab === "pembangunan" ? "bg-indigo-50 text-indigo-700 shadow-sm border-indigo-200 ring-1 ring-indigo-500/10" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
                        <Hammer className="w-4 h-4 flex-shrink-0" />
                        <span className="leading-tight">Proyek Pembangunan</span>
                    </button>
                    <button onClick={() => setActiveTab("olahraga")} className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-3 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center border ${activeTab === "olahraga" ? "bg-indigo-50 text-indigo-700 shadow-sm border-indigo-200 ring-1 ring-indigo-500/10" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
                        <Trophy className="w-4 h-4 flex-shrink-0" />
                        <span className="leading-tight">Sarana Olahraga</span>
                    </button>
                    <button onClick={() => setActiveTab("analisis")} className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-3 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center border ${activeTab === "analisis" ? "bg-slate-800 text-white shadow-md border-slate-700 ring-1 ring-slate-900/10" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
                        <Activity className="w-4 h-4 flex-shrink-0" />
                        <span className="leading-tight">Analisis &amp; Insight</span>
                    </button>
                </div>
                <div className="flex-1 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === "sanitasi" && <SanitasiSection sanitation={sanitation} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />}
                    {activeTab === "pembangunan" && <PembangunanSection development={development} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />}
                    {activeTab === "olahraga" && <OlahragaSection sports={sports} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />}
                    {activeTab === "analisis" && <AnalisisSection sanitation={sanitation} development={development} sports={sports} kelurahans={kelurahans} selectedKelurahan={selectedKelurahan} />}
                </div>
            </main>'''

# Pattern: match from <main ...> right after </header> up to and including </main>
pattern = r'(<main className="px-6 max-w-7xl mx-auto -mt-16 relative z-20 pb-20 flex-1 w-full flex flex-col">.*?</main>)'
match = re.search(pattern, content, re.DOTALL)
if match:
    print("Match found, replacing...")
    content = content[:match.start()] + new_main + content[match.end():]
    with open(filepath, "w", encoding="utf-8", newline="\r\n") as f:
        f.write(content)
    print("Done!")
else:
    print("No match found")
    # Print lines around 676
    lines = content.split("\n")
    for i, line in enumerate(lines[673:690], start=674):
        print(f"{i}: {repr(line)}")
