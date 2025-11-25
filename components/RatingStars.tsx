import React, { useState } from 'react';
import { Star, X } from 'lucide-react';

interface RatingStarsProps {
    value: number;
    onChange?: (rating: number) => void;
    readonly?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showValue?: boolean;
    isDarkMode?: boolean;
}

const RatingStars: React.FC<RatingStarsProps> = ({
    value,
    onChange,
    readonly = false,
    size = 'md',
    showValue = true,
    isDarkMode = false
}) => {
    const [hoverValue, setHoverValue] = useState(0);

    const sizeMap = {
        sm: 14,
        md: 20,
        lg: 28
    };

    const starSize = sizeMap[size];
    const displayValue = hoverValue || value;

    // 将10分制转换为5星
    const getStarFill = (starIndex: number) => {
        const starValue = starIndex * 2;
        if (displayValue >= starValue) return 'full';
        if (displayValue >= starValue - 1) return 'half';
        return 'empty';
    };

    const handleMouseMove = (e: React.MouseEvent, starIndex: number) => {
        if (readonly) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const isHalf = x < rect.width / 2;
        setHoverValue(isHalf ? starIndex * 2 - 1 : starIndex * 2);
    };

    const handleClick = (starIndex: number, e: React.MouseEvent) => {
        if (readonly || !onChange) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const isHalf = x < rect.width / 2;
        onChange(isHalf ? starIndex * 2 - 1 : starIndex * 2);
    };

    return (
        <div className="flex items-center gap-1.5">
            <div 
                className={`flex gap-0.5 ${!readonly ? 'cursor-pointer' : ''}`}
                onMouseLeave={() => setHoverValue(0)}
            >
                {[1, 2, 3, 4, 5].map(star => {
                    const fill = getStarFill(star);
                    return (
                        <div
                            key={star}
                            className="relative"
                            onMouseMove={(e) => handleMouseMove(e, star)}
                            onClick={(e) => handleClick(star, e)}
                        >
                            {/* 背景星星 */}
                            <Star
                                size={starSize}
                                className={`transition-colors ${
                                    isDarkMode ? 'text-zinc-700' : 'text-slate-300'
                                }`}
                            />
                            
                            {/* 填充星星 */}
                            {fill !== 'empty' && (
                                <div
                                    className="absolute inset-0 overflow-hidden"
                                    style={{ width: fill === 'half' ? '50%' : '100%' }}
                                >
                                    <Star
                                        size={starSize}
                                        className="text-amber-400"
                                        fill="currentColor"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {showValue && value > 0 && (
                <span className={`font-bold ${
                    size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
                } ${isDarkMode ? 'text-amber-400' : 'text-amber-500'}`}>
                    {value.toFixed(1)}
                </span>
            )}
        </div>
    );
};

interface RatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment?: string) => void;
    currentRating?: number;
    currentComment?: string;
    mediaTitle: string;
    posterUrl: string | null;
    isDarkMode: boolean;
}

export const RatingModal: React.FC<RatingModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    currentRating = 0,
    currentComment = '',
    mediaTitle,
    posterUrl,
    isDarkMode
}) => {
    const [rating, setRating] = useState(currentRating);
    const [comment, setComment] = useState(currentComment);

    React.useEffect(() => {
        setRating(currentRating);
        setComment(currentComment);
    }, [currentRating, currentComment, isOpen]);

    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (rating > 0) {
            onSubmit(rating, comment.trim() || undefined);
            onClose();
        }
    };

    const getRatingText = (r: number) => {
        if (r >= 9) return '神作！';
        if (r >= 8) return '非常好';
        if (r >= 7) return '很不错';
        if (r >= 6) return '还可以';
        if (r >= 5) return '一般般';
        if (r >= 4) return '不太行';
        if (r >= 3) return '较差';
        if (r >= 2) return '很差';
        if (r >= 1) return '烂片';
        return '点击评分';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            
            <div className={`relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl ${
                isDarkMode ? 'bg-zinc-900' : 'bg-white'
            }`}>
                <div className={`p-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                    <div className="flex items-start gap-4">
                        {posterUrl && (
                            <img
                                src={posterUrl}
                                alt={mediaTitle}
                                className="w-20 h-28 rounded-lg object-cover shadow-lg"
                            />
                        )}
                        <div className="flex-1">
                            <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                为 "{mediaTitle}" 打分
                            </h3>
                            <div className={`text-2xl font-bold mb-1 ${
                                rating > 0 
                                    ? rating >= 7 ? 'text-emerald-500' : rating >= 5 ? 'text-amber-500' : 'text-red-500'
                                    : isDarkMode ? 'text-zinc-500' : 'text-slate-400'
                            }`}>
                                {getRatingText(rating)}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-1.5 rounded-lg transition-colors ${
                                isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'
                            }`}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {/* 评分星星 */}
                    <div className="flex flex-col items-center mb-6">
                        <RatingStars
                            value={rating}
                            onChange={setRating}
                            size="lg"
                            showValue
                            isDarkMode={isDarkMode}
                        />
                        <div className={`text-sm mt-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                            {rating > 0 ? `${rating} / 10 分` : '拖动或点击星星评分'}
                        </div>
                    </div>

                    {/* 评论 */}
                    <div className="mb-6">
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
                            短评 (可选)
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="写下你的观影感受..."
                            rows={3}
                            maxLength={200}
                            className={`w-full px-3 py-2 rounded-lg border resize-none transition-colors ${
                                isDarkMode
                                    ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-indigo-500'
                                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                            } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                        />
                        <div className={`text-xs text-right mt-1 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                            {comment.length}/200
                        </div>
                    </div>

                    {/* 按钮 */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                                isDarkMode
                                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={rating === 0}
                            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                                rating > 0
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : isDarkMode
                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {currentRating > 0 ? '更新评分' : '提交评分'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RatingStars;
