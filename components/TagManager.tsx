import React, { useState } from 'react';
import { Tag, X, Plus, Check, Palette } from 'lucide-react';
import { CustomTag } from '../types';

interface TagManagerProps {
    tags: CustomTag[];
    selectedTagIds: string[];
    onAddTag: (tag: Omit<CustomTag, 'id' | 'createdAt' | 'createdBy'>) => void;
    onRemoveTag: (tagId: string) => void;
    onToggleTag: (tagId: string) => void;
    isDarkMode: boolean;
    compact?: boolean;
}

const TAG_COLORS = [
    { name: '红色', value: 'bg-red-500', text: 'text-red-500', border: 'border-red-500' },
    { name: '橙色', value: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500' },
    { name: '琥珀', value: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500' },
    { name: '黄色', value: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-500' },
    { name: '青柠', value: 'bg-lime-500', text: 'text-lime-500', border: 'border-lime-500' },
    { name: '绿色', value: 'bg-green-500', text: 'text-green-500', border: 'border-green-500' },
    { name: '翠绿', value: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500' },
    { name: '青色', value: 'bg-teal-500', text: 'text-teal-500', border: 'border-teal-500' },
    { name: '天蓝', value: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500' },
    { name: '蓝色', value: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500' },
    { name: '靛蓝', value: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-500' },
    { name: '紫色', value: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500' },
    { name: '紫红', value: 'bg-fuchsia-500', text: 'text-fuchsia-500', border: 'border-fuchsia-500' },
    { name: '粉色', value: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-500' },
    { name: '玫瑰', value: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-500' },
    { name: '灰色', value: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-500' },
];

const TagManager: React.FC<TagManagerProps> = ({
    tags,
    selectedTagIds,
    onAddTag,
    onRemoveTag,
    onToggleTag,
    isDarkMode,
    compact = false
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(TAG_COLORS[10].value);
    const [showColorPicker, setShowColorPicker] = useState(false);

    const handleAddTag = () => {
        if (newTagName.trim()) {
            onAddTag({ name: newTagName.trim(), color: newTagColor });
            setNewTagName('');
            setIsAdding(false);
        }
    };

    const getColorInfo = (color: string) => {
        return TAG_COLORS.find(c => c.value === color) || TAG_COLORS[10];
    };

    if (compact) {
        return (
            <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => {
                    const colorInfo = getColorInfo(tag.color);
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                        <button
                            key={tag.id}
                            onClick={() => onToggleTag(tag.id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
                                isSelected
                                    ? `${tag.color} text-white`
                                    : isDarkMode
                                        ? `bg-zinc-800 ${colorInfo.text} border ${colorInfo.border} border-opacity-30`
                                        : `bg-white ${colorInfo.text} border ${colorInfo.border} border-opacity-30`
                            }`}
                        >
                            {isSelected && <Check size={10} />}
                            {tag.name}
                        </button>
                    );
                })}
                
                {!isAdding ? (
                    <button
                        onClick={() => setIsAdding(true)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            isDarkMode
                                ? 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                                : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        <Plus size={10} />
                        添加
                    </button>
                ) : (
                    <div className="flex items-center gap-1">
                        <input
                            type="text"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                            placeholder="标签名"
                            autoFocus
                            className={`w-20 px-2 py-0.5 rounded text-xs ${
                                isDarkMode
                                    ? 'bg-zinc-800 border-zinc-700 text-white'
                                    : 'bg-white border-slate-200 text-slate-900'
                            } border focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                        />
                        <button
                            onClick={handleAddTag}
                            disabled={!newTagName.trim()}
                            className={`p-1 rounded ${newTagColor} text-white disabled:opacity-50`}
                        >
                            <Check size={12} />
                        </button>
                        <button
                            onClick={() => { setIsAdding(false); setNewTagName(''); }}
                            className={`p-1 rounded ${isDarkMode ? 'hover:bg-zinc-700' : 'hover:bg-slate-200'}`}
                        >
                            <X size={12} className={isDarkMode ? 'text-zinc-400' : 'text-slate-500'} />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* 标签列表 */}
            <div className="flex flex-wrap gap-2">
                {tags.map(tag => {
                    const colorInfo = getColorInfo(tag.color);
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                        <div
                            key={tag.id}
                            className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                                isSelected
                                    ? `${tag.color} text-white shadow-lg`
                                    : isDarkMode
                                        ? `bg-zinc-800 ${colorInfo.text} hover:${tag.color} hover:text-white`
                                        : `bg-slate-100 ${colorInfo.text} hover:${tag.color} hover:text-white`
                            }`}
                        >
                            <button
                                onClick={() => onToggleTag(tag.id)}
                                className="flex items-center gap-1.5"
                            >
                                <Tag size={14} />
                                <span className="text-sm font-medium">{tag.name}</span>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveTag(tag.id);
                                }}
                                className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity ${
                                    isSelected ? 'hover:bg-white/20' : 'hover:bg-black/10'
                                }`}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* 添加新标签 */}
            {isAdding ? (
                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <input
                            type="text"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                            placeholder="输入标签名称"
                            autoFocus
                            className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                                isDarkMode
                                    ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500'
                                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                            } border focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                        />
                        
                        <button
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className={`p-2 rounded-lg ${newTagColor}`}
                            title="选择颜色"
                        >
                            <Palette size={18} className="text-white" />
                        </button>
                    </div>

                    {/* 颜色选择器 */}
                    {showColorPicker && (
                        <div className="grid grid-cols-8 gap-1.5 mb-3 p-2 rounded-lg bg-black/10">
                            {TAG_COLORS.map(color => (
                                <button
                                    key={color.value}
                                    onClick={() => {
                                        setNewTagColor(color.value);
                                        setShowColorPicker(false);
                                    }}
                                    className={`w-6 h-6 rounded-full ${color.value} ${
                                        newTagColor === color.value ? 'ring-2 ring-offset-2 ring-white' : ''
                                    } transition-transform hover:scale-110`}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    )}

                    {/* 预览 */}
                    {newTagName && (
                        <div className="mb-3">
                            <span className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>预览：</span>
                            <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${newTagColor} text-white`}>
                                <Tag size={10} />
                                {newTagName}
                            </span>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={() => { setIsAdding(false); setNewTagName(''); setShowColorPicker(false); }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                isDarkMode
                                    ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                        >
                            取消
                        </button>
                        <button
                            onClick={handleAddTag}
                            disabled={!newTagName.trim()}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            创建标签
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsAdding(true)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isDarkMode
                            ? 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                            : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                    }`}
                >
                    <Plus size={16} />
                    新建标签
                </button>
            )}
        </div>
    );
};

// 标签显示组件 (用于媒体卡片等)
interface TagBadgesProps {
    tags: CustomTag[];
    maxShow?: number;
    size?: 'sm' | 'md';
}

export const TagBadges: React.FC<TagBadgesProps> = ({ tags, maxShow = 3, size = 'sm' }) => {
    const displayTags = tags.slice(0, maxShow);
    const remaining = tags.length - maxShow;

    return (
        <div className="flex flex-wrap gap-1">
            {displayTags.map(tag => (
                <span
                    key={tag.id}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${tag.color} text-white ${
                        size === 'sm' ? 'text-[10px]' : 'text-xs'
                    } font-medium`}
                >
                    {tag.name}
                </span>
            ))}
            {remaining > 0 && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full bg-black/30 text-white ${
                    size === 'sm' ? 'text-[10px]' : 'text-xs'
                }`}>
                    +{remaining}
                </span>
            )}
        </div>
    );
};

export default TagManager;
