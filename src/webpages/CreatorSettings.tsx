import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, DollarSign, Settings, Zap } from "lucide-react"
import { NavLink } from "react-router-dom"

export default function CreatorSettingsPage() {
    const [activeTab, setActiveTab] = useState("pricing")
    const [newCategory, setNewCategory] = useState("")
    const [settings, setSettings] = useState({
        pricePerPost: 299,
        minBudget: 200,
        maxPostsPerWeek: 5,
        autoApprove: false,
        categories: ["Tech & Startups", "AI & ML", "Web Development"],
        voiceStyle: "casual",
        contentGuidelines:
            "I prefer authentic, conversational posts that highlight genuine value. No overly promotional language.",
    })

    const handleSave = () => {
        console.log("Saving settings:", settings)
        // Handle save logic
    }

    const addCategory = () => {
        if (newCategory.trim() && !settings.categories.includes(newCategory.trim())) {
            setSettings((prev) => ({
                ...prev,
                categories: [...prev.categories, newCategory.trim()],
            }))
            setNewCategory("")
        }
    }

    const removeCategory = (categoryToRemove: string) => {
        setSettings((prev) => ({
            ...prev,
            categories: prev.categories.filter((cat) => cat !== categoryToRemove),
        }))
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault()
            addCategory()
        }
    }

    const tabs = [
        { id: "pricing", label: "Pricing", icon: DollarSign },
        { id: "content", label: "Content", icon: Settings },
        { id: "automation", label: "Auto", icon: Zap },
    ]

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-900/95 backdrop-blur-md">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <NavLink to="/creators">
                            <Button variant="ghost" size="sm" className="w-9 h-9 p-0 rounded-full hover:bg-gray-800">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </NavLink>
                        <div>
                            <h1 className="text-lg font-semibold">Settings</h1>
                            <p className="text-xs text-gray-400">Configure your creator profile</p>
                        </div>
                    </div>
                    <Button onClick={handleSave} size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs px-3">
                        <Save className="w-3 h-3 mr-1" />
                        Save
                    </Button>
                </div>
            </header>

            <div className="sticky top-[73px] z-40 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
                <div className="flex overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                                        ? "border-blue-500 text-blue-400"
                                        : "border-transparent text-gray-400 hover:text-gray-300"
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="px-4 py-6 space-y-6">
                {activeTab === "pricing" && (
                    <div className="space-y-4">
                        <div className="grid gap-4">
                            <div>
                                <Label htmlFor="price-per-post" className="text-sm font-medium text-gray-300 mb-2 block">
                                    Price per Post
                                </Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="price-per-post"
                                        type="number"
                                        value={settings.pricePerPost}
                                        onChange={(e) =>
                                            setSettings((prev) => ({ ...prev, pricePerPost: Number.parseInt(e.target.value) }))
                                        }
                                        className="bg-gray-800 border-gray-700 text-white h-11 pl-10"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="min-budget" className="text-sm font-medium text-gray-300 mb-2 block">
                                    Minimum Budget
                                </Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="min-budget"
                                        type="number"
                                        value={settings.minBudget}
                                        onChange={(e) => setSettings((prev) => ({ ...prev, minBudget: Number.parseInt(e.target.value) }))}
                                        className="bg-gray-800 border-gray-700 text-white h-11 pl-10"
                                    />
                                </div>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-4">
                                <Label className="text-sm font-medium text-gray-300 mb-3 block">
                                    Max Posts per Week: {settings.maxPostsPerWeek}
                                </Label>
                                <Slider
                                    value={[settings.maxPostsPerWeek]}
                                    onValueChange={(value) => setSettings((prev) => ({ ...prev, maxPostsPerWeek: value[0] }))}
                                    max={20}
                                    min={1}
                                    step={1}
                                    className="mt-2"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "content" && (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="voice-style" className="text-sm font-medium text-gray-300 mb-2 block">
                                Voice Style
                            </Label>
                            <Input
                                id="voice-style"
                                value={settings.voiceStyle}
                                onChange={(e) => setSettings((prev) => ({ ...prev, voiceStyle: e.target.value }))}
                                placeholder="e.g., casual, professional, enthusiastic"
                                className="bg-gray-800 border-gray-700 text-white h-11 placeholder:text-gray-500"
                            />
                        </div>
                        <div>
                            <Label htmlFor="content-guidelines" className="text-sm font-medium text-gray-300 mb-2 block">
                                Content Guidelines
                            </Label>
                            <Textarea
                                id="content-guidelines"
                                rows={4}
                                value={settings.contentGuidelines}
                                onChange={(e) => setSettings((prev) => ({ ...prev, contentGuidelines: e.target.value }))}
                                placeholder="Describe your preferred tone, style, and any content restrictions..."
                                className="bg-gray-800 border-gray-700 text-white resize-none placeholder:text-gray-500"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium text-gray-300 mb-2 block">Categories</Label>
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <Input
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Add a category..."
                                        className="bg-gray-800 border-gray-700 text-white h-9 text-sm placeholder:text-gray-500 flex-1"
                                    />
                                    <Button
                                        onClick={addCategory}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 h-9 px-3 text-xs"
                                        disabled={!newCategory.trim()}
                                    >
                                        Add
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {settings.categories.map((category, index) => (
                                        <Badge
                                            key={index}
                                            variant="secondary"
                                            className="bg-gray-700 text-gray-300 text-xs flex items-center gap-1 pr-1"
                                        >
                                            {category}
                                            <button
                                                onClick={() => removeCategory(category)}
                                                className="ml-1 hover:bg-gray-600 rounded-full w-4 h-4 flex items-center justify-center text-gray-400 hover:text-white"
                                            >
                                                ×
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "automation" && (
                    <div className="space-y-4">
                        <div className="bg-gray-800 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="auto-approve" className="text-sm font-medium text-gray-300">
                                        Auto-approve posts
                                    </Label>
                                    <p className="text-xs text-gray-400 mt-1">Automatically approve content that meets your guidelines</p>
                                </div>
                                <Switch
                                    id="auto-approve"
                                    checked={settings.autoApprove}
                                    onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, autoApprove: checked }))}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
