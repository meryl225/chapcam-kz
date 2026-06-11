import { Sparkles, Radio, Camera, Lock } from "lucide-react"

const features = [
  {
    icon: Sparkles,
    title: "Avatar IA",
    description: "ton perso en live",
    color: "from-[#00d4ff] to-[#8b5cf6]",
  },
  {
    icon: Radio,
    title: "Stream & gaming",
    description: "OBS, Twitch, Discord",
    color: "from-[#8b5cf6] to-[#e91e8c]",
  },
  {
    icon: Camera,
    title: "Qualite contenu",
    description: "1080p / 4K",
    color: "from-[#e91e8c] to-[#00d4ff]",
  },
  {
    icon: Lock,
    title: "Reste anonyme",
    description: "ton vrai visage cache",
    color: "from-[#8b5cf6] to-[#00d4ff]",
  },
]

export function FeatureList() {
  return (
    <div className="flex flex-col gap-4">
      {features.map((feature, index) => (
        <div key={index} className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} p-[1px]`}>
            <div className="w-full h-full rounded-xl bg-[#0a0e1a] flex items-center justify-center">
              <feature.icon className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-white font-semibold">{feature.title}</h3>
            <p className="text-muted-foreground text-sm">{feature.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
