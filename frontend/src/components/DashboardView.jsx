import { ESCROW_ACTIONS } from '../utils/constants';
import { compactText, formatDateTime, formatPrice } from '../utils/format';

const toMessageText = (message) => {
  if (!message) return '';
  if (message.status === 'deleted') return 'Tin nhan da thu hoi';
  if (message.content && message.content !== '[image]') return message.content;
  if (message.attachmentUrls?.length) return `[${message.attachmentUrls.length} anh]`;
  return '[Tin nhan]';
};

const DashboardView = ({ orders, auctions, escrows, reviews, conversations, activeConversationId, setActiveConversationId, loadMessages, activeConversation, messages, user, chatDraft, setChatDraft, sendChat, typingNames, onEscrowAction, onEditMessage }) => (
  <section className="dashboard-grid">
    <article className="panel"><div className="section-head"><h3>Orders</h3><span>{orders.length}</span></div>{orders.map((item) => <div key={item._id} className="list-item"><strong>{item.product?.title || item.orderCode}</strong><span>{item.status}</span><span>{formatPrice(item.totalAmount)} VND</span></div>)}</article>
    <article className="panel"><div className="section-head"><h3>Auctions</h3><span>{auctions.length}</span></div>{auctions.map((item) => <div key={item._id} className="list-item"><strong>{item.product?.title || 'Auction'}</strong><span>{item.status}</span><span>{formatDateTime(item.endAt)}</span></div>)}</article>
    <article className="panel"><div className="section-head"><h3>Escrows</h3><span>{escrows.length}</span></div>{escrows.map((item) => <div key={item._id} className="list-item"><strong>{item.order?.orderCode || item._id}</strong><span>{item.status}</span><div className="mini-actions">{ESCROW_ACTIONS.map((action) => <button key={action} onClick={() => onEscrowAction(item._id, action)}>{action}</button>)}</div></div>)}</article>
    <article className="panel"><div className="section-head"><h3>Reviews</h3><span>{reviews.length}</span></div>{reviews.map((item) => <div key={item._id} className="list-item"><strong>{item.product?.title || 'Review'}</strong><span>{item.score}/5</span><span>{compactText(item.comment || 'Khong co noi dung', 80)}</span></div>)}</article>
    <article className="panel chat-panel wide"><div className="section-head"><h3>Conversations</h3><span>{conversations.length}</span></div><div className="chat-layout"><div className="conversation-list">{conversations.map((item) => <button key={item._id} className={item._id === activeConversationId ? 'conversation active' : 'conversation'} onClick={() => { setActiveConversationId(item._id); loadMessages(item._id); }}><strong>{item.subject || item.product?.title || 'Conversation'}</strong><span>{compactText(item.lastMessage || 'Chua co noi dung', 50)}</span>{Number(item.unreadCount || 0) ? <em>{item.unreadCount}</em> : null}</button>)}</div><div className="chat-thread-wrap">{activeConversation ? (<><div className="chat-thread">{messages.map((message) => <div key={message._id} className={String(message.sender?._id || message.sender) === String(user?._id) ? 'bubble self' : 'bubble'}><strong>{message.sender?.fullName || message.sender?.username || 'User'}</strong>{message.replyTo ? <span className="muted tiny">Reply: {toMessageText(message.replyTo)}</span> : null}<span>{toMessageText(message)}</span><small>{formatDateTime(message.createdAt)}</small>{String(message.sender?._id || message.sender) === String(user?._id) && message.status !== 'deleted' ? <button onClick={() => onEditMessage(message)}>Sua</button> : null}</div>)}</div><form className="chat-compose" onSubmit={sendChat}><input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder={typingNames.length ? `${typingNames.join(', ')} dang go...` : 'Nhap tin nhan'} /><button type="submit">Gui</button></form></>) : <div className="muted">Chon conversation de chat.</div>}</div></div></article>
  </section>
);

export default DashboardView;
