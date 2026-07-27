import React from 'react';
import type { ImageValue } from '../../runtime/types';
import { getValue, type InspectorProps } from './TextInspector';

export default function ImageInspector({ state, dispatch, fieldKey, field }: InspectorProps) {
  const value = (getValue(state, fieldKey) ?? { src: '', alt: '' }) as ImageValue;
  const [warn, setWarn] = React.useState<string | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);

  const set = (patch: Partial<ImageValue>) => dispatch({ type: 'change', field: fieldKey, value: { ...value, ...patch } });

  const upload = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    if (field.type === 'image' && field.ratio) fd.append('ratio', field.ratio);
    if (field.type === 'image' && field.minWidth) fd.append('minWidth', String(field.minWidth));
    const r = await fetch(`/api/projects/${state.project!.id}/media`, { method: 'POST', body: fd });
    const data = await r.json();
    if (!r.ok) {
      setWarn(data.error || 'Upload failed');
      return;
    }
    setWarn(data.warning || null);
    set({ src: data.src, width: data.width, height: data.height });
  };

  const altMissing = field.type === 'image' && field.altRequired && !value.alt.trim();

  return (
    <div className="studio-field">
      {value.src && <img className="studio-inspector-preview" src={value.src} alt={value.alt} />}
      <input
        ref={fileInput}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.avif,.svg"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <button onClick={() => fileInput.current?.click()}>Replace image</button>
      {field.type === 'image' && (
        <p className="studio-muted">
          {field.ratio && <>Ratio {field.ratio}. </>}
          {field.minWidth && <>Min width {field.minWidth}px. </>}
          {value.width && value.height && (
            <>
              {value.width}×{value.height}px
            </>
          )}
        </p>
      )}
      <label>
        Alt text {field.altRequired ? '(required)' : ''}
        <input type="text" value={value.alt} onChange={(e) => set({ alt: e.target.value })} />
      </label>
      {altMissing && <p className="studio-warning">Alt text is required for this image.</p>}
      {warn && <p className="studio-warning">{warn}</p>}
    </div>
  );
}
