import SectionCard from '../components/SectionCard';
import { UPLOAD_OWNER_TYPES } from '@frontend-utils/constants';
import { compactText } from '@frontend-utils/format';

const UploadView = ({
  uploadState,
  setUploadState,
  mediaLibrary,
  onUploadBase64,
  onUploadSingle,
  onUploadMany,
  onUploadRemote,
  onDeleteMedia,
}) => (
  <div className="view-grid">
    <SectionCard title="Upload Lab" subtitle="Base64, multipart, multipart-many, remote" className="wide">
      <div className="form-grid form-grid--three">
        <select value={uploadState.ownerType} onChange={(event) => setUploadState((current) => ({ ...current, ownerType: event.target.value }))}>
          {UPLOAD_OWNER_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input value={uploadState.ownerId} onChange={(event) => setUploadState((current) => ({ ...current, ownerId: event.target.value }))} placeholder="ownerId" />
        <input value={uploadState.remoteUrl} onChange={(event) => setUploadState((current) => ({ ...current, remoteUrl: event.target.value }))} placeholder="Remote URL" />
      </div>
      <div className="actions-row wrap">
        <label className="upload-pill">
          Single multipart
          <input type="file" accept="image/*" onChange={(event) => onUploadSingle(event.target.files?.[0] || null)} />
        </label>
        <label className="upload-pill">
          Multipart many
          <input type="file" multiple accept="image/*" onChange={(event) => onUploadMany(Array.from(event.target.files || []))} />
        </label>
        <label className="upload-pill">
          Base64 image
          <input type="file" accept="image/*" onChange={(event) => onUploadBase64(event.target.files?.[0] || null)} />
        </label>
        <button type="button" onClick={onUploadRemote}>Dang ky remote media</button>
      </div>
    </SectionCard>

    <SectionCard title="Media da upload" subtitle={`${mediaLibrary.length} item`} className="wide">
      <div className="resource-list">
        {mediaLibrary.map((media) => (
          <article key={media._id} className="resource-item">
            <div>
              <strong>{media.ownerType || 'media'}</strong>
              <p>{compactText(media.url, 90)}</p>
            </div>
            <div className="resource-item__meta">
              <small>{media.mimeType || media.type}</small>
              <button type="button" onClick={() => onDeleteMedia(media._id)}>Xoa media</button>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  </div>
);

export default UploadView;
