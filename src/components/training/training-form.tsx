'use client';

import { useState } from 'react';
import { useTrainingStore } from '@/store/training-store';
import { trainingItems } from '@/lib/training-items';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Save, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function TrainingForm() {
  const { currentRecord, addRecord, updateRecord, isLoading } = useTrainingStore();
  const [isSaving, setIsSaving] = useState(false);

  if (!currentRecord) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">날짜를 선택해주세요.</p>
        </CardContent>
      </Card>
    );
  }

  const handleChange = (key: string, value: any) => {
    useTrainingStore.setState({
      currentRecord: { ...currentRecord, [key]: value },
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 빈 값(undefined)을 0으로 변환하여 저장
      const sanitizedRecord: any = { ...currentRecord };
      const numberFields = ['행공', '본수련', '마음과마음가짐수련', '행공퍼센트', '운광복습', '삼주축광', '내면공간'];
      const gradeFields = ['회광반조', '성찰탐구'];

      numberFields.forEach((field) => {
        if (sanitizedRecord[field] === undefined || sanitizedRecord[field] === null) {
          sanitizedRecord[field] = 0;
        }
      });

      gradeFields.forEach((field) => {
        if (!sanitizedRecord[field]) {
          sanitizedRecord[field] = 'C';
        }
      });

      const record = {
        ...sanitizedRecord,
        date: currentRecord.date,
      } as any;

      // API를 호출해서 저장
      // createdAt이 있으면 수정 (이미 저장된 레코드)
      const isExistingRecord = currentRecord.createdAt && currentRecord.id;

      if (isExistingRecord && currentRecord.id) {
        // 이미 저장된 레코드면 수정
        await updateRecord(currentRecord.id, record);
        toast.success('수련 기록이 수정되었습니다.');
      } else {
        // 새 레코드면 생성
        await addRecord(record as any);
        toast.success('수련 기록이 저장되었습니다.');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || '저장에 실패했습니다.';
      toast.error(errorMessage);
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderInput = (item: any) => {
    const value = (currentRecord as any)[item.key];

    switch (item.type) {
      case 'boolean':
        return (
          <div key={item.key} className="flex items-center justify-between py-3 border-b">
            <Label htmlFor={item.key} className="text-base font-medium cursor-pointer">
              {item.label}
            </Label>
            <Switch
              id={item.key}
              checked={value as boolean}
              onCheckedChange={(checked) => handleChange(item.key, checked)}
            />
          </div>
        );

      case 'number':
        return (
          <div key={item.key} className="space-y-1.5 py-2 border-b">
            <Label htmlFor={item.key} className="text-base font-medium">
              {item.label}
            </Label>
            <Input
              id={item.key}
              type="number"
              inputMode="numeric"
              value={value === undefined || value === null ? '' : value.toString()}
              onChange={(e) => {
                const val = e.target.value;
                // 빈 값 허용 (undefined로 설정), 저장할 때만 0로 변환
                if (val === '') {
                  handleChange(item.key, undefined as any);
                } else {
                  const numValue = parseInt(val, 10) || 0;
                  handleChange(item.key, numValue);
                }
              }}
              placeholder={item.placeholder || '0'}
              min={item.min}
              step={item.step}
            />
          </div>
        );

      case 'percent': {
        // 값이 없으면 0으로 초기화
        const percentValue = value ?? 0;
        // 표시용: 10% 단위로 반올림한 값
        const displayValue = Math.round((percentValue as number) / 10) * 10;
        return (
          <div key={item.key} className="space-y-2 py-3 border-b">
            <div className="flex justify-between items-center">
              <Label className="text-base font-medium">{item.label}</Label>
              <span className="text-lg font-semibold text-blue-600 dark:text-blue-400 min-w-[3rem] text-right">
                {displayValue}%
              </span>
            </div>
            <div className="px-1 py-1">
              <Slider
                value={[percentValue as number]}
                onValueChange={([v]) => handleChange(item.key, v)}
                onValueCommit={([v]) => {
                  // 손을 놓았을 때 10% 단위로 스냅
                  const snapped = Math.round(v / 10) * 10;
                  handleChange(item.key, snapped);
                }}
                min={item.min}
                max={item.max}
                step={item.step}
                className="w-full touch-action-manipulation"
                style={{ touchAction: 'manipulation' }}
              />
            </div>
          </div>
        );
      }

      case 'grade':
        return (
          <div key={item.key} className="space-y-1.5 py-2 border-b">
            <Label htmlFor={item.key} className="text-base font-medium">
              {item.label}
            </Label>
            <Select value={value as string} onValueChange={(v) => handleChange(item.key, v)}>
              <SelectTrigger id={item.key}>
                <SelectValue placeholder="등급 선택" />
              </SelectTrigger>
              <SelectContent>
                {item.options?.map((option: any) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card id="training-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          수련 기록 ({currentRecord.date})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {trainingItems.map((item, index) => {
          // 행공과 본수련을 한 줄로 배치
          if (item.key === '행공') {
            const 본수련Item = trainingItems.find(i => i.key === '본수련');
            if (본수련Item) {
              const 행공Value = (currentRecord as any)[item.key];
              const 본수련Value = (currentRecord as any)[본수련Item.key];
              return (
                <div key={`행공-본수련`} className="grid grid-cols-2 gap-4 py-2 border-b">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <Label htmlFor={item.key} className="text-base font-medium">
                      {item.label}
                    </Label>
                    <Input
                      id={item.key}
                      type="number"
                      inputMode="numeric"
                      value={행공Value === undefined || 행공Value === null ? '' : 행공Value.toString()}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          handleChange(item.key, undefined as any);
                        } else {
                          const numValue = parseInt(val, 10) || 0;
                          handleChange(item.key, numValue);
                        }
                      }}
                      placeholder={item.placeholder || '0'}
                      min={item.min}
                      step={item.step}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <Label htmlFor={본수련Item.key} className="text-base font-medium">
                      {본수련Item.label}
                    </Label>
                    <Input
                      id={본수련Item.key}
                      type="number"
                      inputMode="numeric"
                      value={본수련Value === undefined || 본수련Value === null ? '' : 본수련Value.toString()}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          handleChange(본수련Item.key, undefined as any);
                        } else {
                          const numValue = parseInt(val, 10) || 0;
                          handleChange(본수련Item.key, numValue);
                        }
                      }}
                      placeholder={본수련Item.placeholder || '0'}
                      min={본수련Item.min}
                      step={본수련Item.step}
                      className="w-full"
                    />
                  </div>
                </div>
              );
            }
          }
          // 본수련은 이미 행공과 함께 렌더링되므로 건너뛰기
          if (item.key === '본수련') {
            return null;
          }
          // 회광반조와 성찰탐구를 한 줄로 배치
          if (item.key === '회광반조') {
            const 성찰탐구Item = trainingItems.find(i => i.key === '성찰탐구');
            if (성찰탐구Item) {
              const 회광반조Value = (currentRecord as any)[item.key];
              const 성찰탐구Value = (currentRecord as any)[성찰탐구Item.key];
              return (
                <div key={`회광반조-성찰탐구`} className="grid grid-cols-2 gap-4 py-2 border-b">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <Label htmlFor={item.key} className="text-base font-medium">
                      {item.label}
                    </Label>
                    <Select value={회광반조Value as string} onValueChange={(v) => handleChange(item.key, v)}>
                      <SelectTrigger id={item.key} className="w-full">
                        <SelectValue placeholder="등급 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {item.options?.map((option: any) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <Label htmlFor={성찰탐구Item.key} className="text-base font-medium">
                      {성찰탐구Item.label}
                    </Label>
                    <Select value={성찰탐구Value as string} onValueChange={(v) => handleChange(성찰탐구Item.key, v)}>
                      <SelectTrigger id={성찰탐구Item.key} className="w-full">
                        <SelectValue placeholder="등급 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {성찰탐구Item.options?.map((option: any) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            }
          }
          // 성찰탐구는 이미 회광반조와 함께 렌더링되므로 건너뛰기
          if (item.key === '성찰탐구') {
            return null;
          }
          return renderInput(item);
        })}

        <div className="space-y-1.5 py-2 border-t mt-2">
          <Label htmlFor="memo" className="text-base font-medium">
            메모
          </Label>
          <Textarea
            id="memo"
            value={currentRecord.memo || ''}
            onChange={(e) => handleChange('memo', e.target.value)}
            placeholder="오늘의 수련에 대한 메모를 남겨주세요..."
            rows={4}
            className="min-h-[96px]"
          />
        </div>

        <Button onClick={handleSave} className="w-full mt-6" size="lg" disabled={isSaving || isLoading}>
          {isSaving || isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              저장하기
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
