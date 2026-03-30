import SectionCard from '../components/SectionCard';
import { compactText, formatDateTime } from '@frontend-utils/format';

const previewMessage = (message) => {
  if (!message) return '';
  if (message.status === 'deleted') return 'Tin nhắn đã thu hồi';
  if (message.content) return compactText(message.content, 72);
  if (message.attachmentUrls?.length) return `[${message.attachmentUrls.length} ảnh đính kèm]`;
  return '[Tin nhắn]';
};

const conversationLabel = (conversation, user) => {
  const others = (conversation?.participants || []).filter(
    (item) => String(item?._id || item) !== String(user?._id)
  );
  return (
    conversation?.subject ||
    others[0]?.fullName ||
    others[0]?.username ||
    conversation?.product?.title ||
    'Cuộc trò chuyện'
  );
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
    <SectionCard title="Tin nhắn" subtitle={`Trạng thái kết nối: ${socketState}`} className="wide">
      <div className="chat-layout chat-layout--modern">
        <aside className="conversation-column conversation-column--market chat-sidebar">
          <div className="conversation-column__head">
            <strong>Hội thoại</strong>
            <span className="muted">{conversations.length} cuộc trò chuyện</span>
          </div>

          <div className="chat-sidebar__list">
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
                  <span>{compactText(conversation.lastMessage || 'Chưa có tin nhắn', 48)}</span>
                  <div className="tag-row">
                    {conversation.unreadCount ? (
                      <small className="badge-dot">{conversation.unreadCount} chưa đọc</small>
                    ) : (
                      <small>Đã đọc</small>
                    )}
                    <small>{conversation.product?.title ? 'Theo sản phẩm' : 'Trò chuyện trực tiếp'}</small>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {!conversations.length ? (
            <p className="muted">Khi mở chat từ sản phẩm, cuộc trò chuyện sẽ hiện ở đây.</p>
          ) : null}
        </aside>

        <section className="thread-column thread-column--market chat-thread">
          {activeConversation ? (
            <>
              <div className="thread-head chat-thread__head">
                <div>
                  <strong>{activeConversation.subject || activeConversation.product?.title || 'Cuộc trò chuyện'}</strong>
                  <p className="muted">
                    {typingNames.length
                      ? `${typingNames.join(', ')} đang nhập...`
                      : 'Trao đổi trực tiếp với người bán để xác nhận tình trạng sản phẩm và hẹn giao dịch.'}
                  </p>
                </div>
                <span className="route-pill">{activeConversation.product?.title || 'Tin nhắn trực tiếp'}</span>
              </div>

              <div className="thread-body chat-thread__body">
                {messages.map((message) => {
                  const isSelf = String(message.sender?._id || message.sender) === String(user?._id);
                  return (
                    <article key={message._id} className={`message-row${isSelf ? ' message-row--self' : ''}`}>
                      <div className={`message-card${isSelf ? ' self' : ''}`}>
                        <div className="message-card__head">
                          <div className="message-card__author">
                            <span className="message-avatar">
                              {avatarLabel(message.sender?.fullName || message.sender?.username || 'U')}
                            </span>
                            <div className="message-card__author-meta">
                              <strong>{message.sender?.fullName || message.sender?.username || 'Người dùng'}</strong>
                              <small>
                                {isSelf
                                  ? message.status === 'read'
                                    ? 'Đã đọc'
                                    : message.status === 'deleted'
                                      ? 'Đã thu hồi'
                                      : 'Đã gửi'
                                  : 'Tin nhắn đến'}
                              </small>
                            </div>
                          </div>
                          <small className="muted">{formatDateTime(message.createdAt)}</small>
                        </div>

                        {message.replyTo ? (
                          <div className="reply-chip">Đang trả lời: {previewMessage(message.replyTo)}</div>
                        ) : null}

                        <p className="message-card__content">
                          {message.status === 'deleted' ? 'Tin nhắn đã thu hồi' : message.content || '[Ảnh đính kèm]'}
                        </p>

                        {message.attachmentUrls?.length ? (
                          <div className="thumb-row message-gallery">
                            {message.attachmentUrls.map((url, index) => (
                              <figure key={`${message._id}-${url}-${index}`} className="attachment-thumb">
                                <img src={url} alt="Ảnh đính kèm" />
                                {isSelf && message.attachments?.[index] ? (
                                  <button type="button" onClick={() => onDeleteAttachment(message, message.attachments[index])}>
                                    Xóa ảnh
                                  </button>
                                ) : null}
                              </figure>
                            ))}
                          </div>
                        ) : null}

                        <div className="mini-actions wrap">
                          <button type="button" onClick={() => setReplyTo(message)}>
                            Trả lời
                          </button>
                          {isSelf && message.status !== 'deleted' ? (
                            <button type="button" onClick={() => onEditMessage(message)}>
                              Sửa
                            </button>
                          ) : null}
                          {isSelf && message.status !== 'deleted' ? (
                            <button type="button" onClick={() => onDeleteMessage(message)}>
                              Thu hồi
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <form className="stack gap-sm chat-composer" onSubmit={sendChat}>
                {replyTo ? (
                  <div className="reply-chip">
                    Đang trả lời: {previewMessage(replyTo)}
                    <button type="button" onClick={() => setReplyTo(null)}>
                      Bỏ trả lời
                    </button>
                  </div>
                ) : null}

                <textarea
                  rows={4}
                  value={chatDraft}
                  onChange={(event) => {
                    setChatDraft(event.target.value);
                    onTypingChange();
                  }}
                  placeholder="Nhập tin nhắn..."
                />

                <div className="chat-composer__actions">
                  <label className="upload-pill chat-upload-pill">
                    Thêm hình ảnh
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(event) => setChatFiles(Array.from(event.target.files || []))}
                    />
                  </label>
                  {chatFiles.length ? <p className="muted">Đang chuẩn bị {chatFiles.length} ảnh để gửi.</p> : null}
                </div>

                <div className="actions-row">
                  <button type="submit" className="primary-btn">
                    Gửi tin nhắn
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="empty-state">
              <strong>Chọn một cuộc trò chuyện để bắt đầu.</strong>
              <p className="muted">Khi bạn bấm chat từ sản phẩm, nội dung sẽ hiện ở đây.</p>
            </div>
          )}
        </section>
      </div>
    </SectionCard>
  </div>
);

export default ChatView;
