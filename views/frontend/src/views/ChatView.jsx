import SectionCard from '../components/SectionCard';
import { compactText, formatDateTime } from '@frontend-utils/format';

const previewMessage = (message) => {
  if (!message) return '';
  if (message.status === 'deleted') return 'Tin nhan da thu hoi';
  if (message.content) return compactText(message.content, 72);
  if (message.attachmentUrls?.length) return `[${message.attachmentUrls.length} attachment]`;
  return '[message]';
};

const conversationLabel = (conversation, user) => {
  const others = (conversation?.participants || []).filter(
    (item) => String(item?._id || item) !== String(user?._id)
  );
  return conversation?.subject || others[0]?.fullName || others[0]?.username || conversation?.product?.title || 'Conversation';
};

const avatarLabel = (value) => String(value || 'U').slice(0, 1).toUpperCase();

const ChatView = ({
  socketState,
  conversations,
  activeConversationId,
  onSelectConversation,
  activeConversation,
  messages,
  chatDraft,
  setChatDraft,
  replyTo,
  setReplyTo,
  chatFiles,
  setChatFiles,
  sendChat,
  typingNames,
  onTypingChange,
  onEditMessage,
  onDeleteMessage,
  onDeleteAttachment,
  user,
}) => (
  <div className="view-grid">
    <SectionCard title="Tin nhan" subtitle={`Socket ${socketState}`} className="wide">
      <div className="chat-layout">
        <div className="conversation-column conversation-column--market">
          <div className="conversation-column__head">
            <strong>Hoi thoai</strong>
            <span className="muted">{conversations.length} cuoc tro chuyen</span>
          </div>
          {conversations.map((conversation) => (
            <button
              key={conversation._id}
              className={conversation._id === activeConversationId ? 'conversation-card active' : 'conversation-card'}
              onClick={() => onSelectConversation(conversation._id)}
            >
              <div className="conversation-card__avatar">
                {avatarLabel(conversationLabel(conversation, user))}
              </div>
              <div className="conversation-card__content">
              <div className="conversation-card__head">
                <strong>{conversationLabel(conversation, user)}</strong>
                <small>{formatDateTime(conversation.lastMessageAt)}</small>
              </div>
              <span>{compactText(conversation.lastMessage || 'Chua co message', 48)}</span>
              <div className="tag-row">
                {conversation.unreadCount ? <small className="badge-dot">{conversation.unreadCount} unread</small> : <small>Da doc</small>}
                <small>{conversation.product?.title ? 'Theo san pham' : 'Direct'}</small>
              </div>
              </div>
            </button>
          ))}
          {!conversations.length ? <p className="muted">Catalog, order va product detail deu da co nut mo conversation.</p> : null}
        </div>
        <div className="thread-column thread-column--market">
          {activeConversation ? (
            <>
              <div className="thread-head">
                <div>
                  <strong>{activeConversation.subject || activeConversation.product?.title || 'Conversation'}</strong>
                  <p className="muted">{typingNames.length ? `${typingNames.join(', ')} dang go...` : 'Chat truc tiep voi nguoi ban de xac nhan tinh trang san pham va hen giao dich.'}</p>
                </div>
                <span className="route-pill">{activeConversation.product?.title || 'Direct message'}</span>
              </div>
              <div className="thread-body">
                {messages.map((message) => {
                  const isSelf = String(message.sender?._id || message.sender) === String(user?._id);
                  return (
                    <article key={message._id} className={isSelf ? 'message-bubble self' : 'message-bubble'}>
                      <div className="message-bubble__head">
                        <div className="message-bubble__sender">
                          <span className="message-avatar">
                            {avatarLabel(message.sender?.fullName || message.sender?.username || 'U')}
                          </span>
                          <strong>{message.sender?.fullName || message.sender?.username || 'User'}</strong>
                        </div>
                        <div className="message-bubble__meta">
                          <small>{formatDateTime(message.createdAt)}</small>
                          <small>{isSelf ? (message.status === 'read' ? 'Da doc' : message.status === 'deleted' ? 'Da thu hoi' : 'Da gui') : 'Tin nhan'}</small>
                        </div>
                      </div>
                      {message.replyTo ? <div className="reply-chip">Reply: {previewMessage(message.replyTo)}</div> : null}
                      <p>{message.status === 'deleted' ? 'Tin nhan da thu hoi' : message.content || '[attachment]'}</p>
                      {message.attachmentUrls?.length ? (
                        <div className="thumb-row message-gallery">
                          {message.attachmentUrls.map((url, index) => (
                            <figure key={`${message._id}-${url}-${index}`} className="attachment-thumb">
                              <img src={url} alt="attachment" />
                              {isSelf && message.attachments?.[index] ? (
                                <button type="button" onClick={() => onDeleteAttachment(message, message.attachments[index])}>Xoa anh</button>
                              ) : null}
                            </figure>
                          ))}
                        </div>
                      ) : null}
                      <div className="mini-actions">
                        <button type="button" onClick={() => setReplyTo(message)}>Reply</button>
                        {isSelf && message.status !== 'deleted' ? <button type="button" onClick={() => onEditMessage(message)}>Sua</button> : null}
                        {isSelf && message.status !== 'deleted' ? <button type="button" onClick={() => onDeleteMessage(message)}>Thu hoi</button> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
              <form className="stack gap-sm" onSubmit={sendChat}>
                {replyTo ? (
                  <div className="reply-chip">
                    Dang reply: {previewMessage(replyTo)}
                    <button type="button" onClick={() => setReplyTo(null)}>Bo reply</button>
                  </div>
                ) : null}
                <textarea
                  rows={3}
                  value={chatDraft}
                  onChange={(event) => {
                    setChatDraft(event.target.value);
                    onTypingChange();
                  }}
                  placeholder="Nhap tin nhan"
                />
                <label className="upload-pill chat-upload-pill">
                  Them hinh anh
                  <input type="file" multiple accept="image/*" onChange={(event) => setChatFiles(Array.from(event.target.files || []))} />
                </label>
                {chatFiles.length ? <p className="muted">Dang chuan bi {chatFiles.length} anh de gui.</p> : null}
                <div className="actions-row">
                  <button type="submit" className="primary-btn">Gui message</button>
                </div>
              </form>
            </>
          ) : (
            <div className="empty-state">
              <strong>Chon mot conversation de bat dau.</strong>
              <p className="muted">Khi user bam vao san pham va mo chat voi nguoi ban, hoi thoai se hien tai day nhu mot trang tin nhan thong thuong.</p>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  </div>
);

export default ChatView;
