import React from "react";
import { Card, CardContent } from "../ui/card";
import { DollarSign } from "lucide-react";

interface CompletedCardProps {
    promotion: any
}

const CompletedCard: React.FC<CompletedCardProps> = ({ promotion }) => {
    return (
        <Card key={promotion.id} className="bg-white/10 backdrop-blur-sm border-white/20 rounded-2xl mb-5">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center text-white font-semibold">
                            {promotion.category.charAt(0)}
                        </div>
                        <div>
                            <div className="font-semibold text-white">{promotion.category} Campaign</div>
                            <div className="text-sm text-white/60">{promotion.postedAt}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-green-400 font-bold text-lg">+${promotion.earned}</div>
                        <div className="text-xs text-white/60">Earned</div>
                    </div>
                </div>

                <p className="text-sm leading-relaxed text-white/80 mb-4">{promotion.text}</p>

                <div className="flex items-center justify-between text-sm">
                    <div className="text-white/60">{promotion.engagement}</div>
                    <div className="flex items-center gap-2 text-green-400 font-medium">
                        <DollarSign className="w-4 h-4" />
                        Paid automatically
                    </div>
                </div>
            </CardContent>
        </Card>

    );

}

export default CompletedCard;