import { useEffect, useState, useRef } from "react";
import { HubConnectionBuilder } from "@microsoft/signalr";
import { jwtDecode } from "jwt-decode";

import {
  getAllUsers,
  getPrivateMessages,
  getGroupsUser,
  getMassegesGroups,
  createGroub,
  sendMessages,
} from "../services/api";

import {
  Layout,
  Modal,
  Menu,
  Checkbox,
  Button,
  List,
  Input,
  Typography,
  Divider,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  MessageOutlined,
  PlusOutlined,
} from "@ant-design/icons";

import { AUTH_CONFIG } from "../config/env";
import "./ChatRoom.css";

const { Sider, Content } = Layout;
const { TextArea } = Input;
const { Title } = Typography;

export default function ChatRoom() {
  /* ------------------------------------------------------------------ */
  /* 🔑 بيانات المستخدم الحالى من التوكن */
  const token = localStorage.getItem(AUTH_CONFIG.tokenKey || "accessToken");
  const decoded = token ? jwtDecode(token) : {};
  const currentUserId = decoded.userId || decoded.nameid || decoded.sub;

  /* ------------------------------------------------------------------ */
  /* 🏷️   State */
  const [hub, setHub] = useState(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);

  const [selectedReceiverId, setSelectedReceiverId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  /* إنشاء مجموعة */
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  /* مرجع للتمرير التلقائى لأسفل */
  const bottomRef = useRef(null);

  /* ------------------------------------------------------------------ */
  /* 🔌 إنشاء اتصال SignalR */
  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl("https://localhost:7152/chatHub", {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    connection
      .start()
      .then(() => {
        setHub(connection);
      })
      .catch((err) => console.error("SignalR Connection Error:", err));

    return () => connection.stop();
  }, [token]);

  /* ------------------------------------------------------------------ */
  /* 📥 مستمعو الرسائل */
  useEffect(() => {
    if (!hub) return;

    const onReceive = (senderId, senderName, content, timestamp) => {
      // console.log("🔔 تلقَّيت:", { senderId, senderName, content, timestamp });
      setMessages((prev) => [
        ...prev,
        {
          senderId,
          senderName,
          content,
          mine: senderId === currentUserId,
          timestamp,
        },
      ]);
    };

    hub.on("ReceivePrivateMessage", onReceive);
    hub.on("ReceiveGroupMessage", onReceive);
    hub.on("ReceiveMessage", onReceive);

    return () => {
      hub.off("ReceivePrivateMessage", onReceive);
      hub.off("ReceiveGroupMessage", onReceive);
      hub.off("ReceiveMessage", onReceive);
    };
  }, [hub, currentUserId]);

  /* ------------------------------------------------------------------ */
  /* ⬇️ تمرير آلى لآخر رسالة */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ------------------------------------------------------------------ */
  /* 📡 جلب المستخدمين والمجموعات مرة واحدة */
  useEffect(() => {
    (async () => {
      try {
        setUsers(await getAllUsers());
        setGroups(await getGroupsUser());
      } catch (e) {
        console.error("فشل تحميل البيانات:", e);
      }
    })();
  }, []);

  /* ------------------------------------------------------------------ */
  /* 📡 جلب رسائل المستخدم المختار */
  useEffect(() => {
    if (!selectedReceiverId) return;

    (async () => {
      try {
        const data = await getPrivateMessages(selectedReceiverId);
        setMessages(
          data.map((m) => ({
            senderId: m.senderId,
            senderName: m.senderName,
            content: m.content,
            mine: m.senderId === currentUserId,
            timestamp: m.timestamp,
          }))
        );
      } catch (e) {
        console.error("فشل جلب رسائل خاصة:", e);
      }
    })();
  }, [selectedReceiverId, currentUserId]);

  /* ------------------------------------------------------------------ */
  /* 📡 دخول مجموعة + جلب رسائلها */
  const joinGroup = async (groupId) => {
    if (!hub) return;

    await hub.invoke("JoinGroup", groupId.toString());
    setSelectedGroupId(groupId);
    setSelectedReceiverId(null);
    try {
      const data = await getMassegesGroups(groupId);
      setMessages(
        data.map((m) => ({
          senderId: m.senderId,
          senderName: m.senderName,
          content: m.content,
          mine: m.senderId === currentUserId,
          timestamp: m.timestamp,
        }))
      );
    } catch (e) {
      console.error("فشل جلب رسائل المجموعة:", e);
    }
  };

  /* ------------------------------------------------------------------ */
  /* 📨 إرسال رسالة */
  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      await sendMessages(
        message,
        selectedGroupId ? null : selectedReceiverId,
        selectedGroupId ? Number(selectedGroupId) : null
      );
      setMessage("");
    } catch (e) {
      console.error("فشل الإرسال:", e);
    }
  };

  /* ------------------------------------------------------------------ */
  /* ➕ إنشاء مجموعة جديدة */
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedMemberIds.length === 0) return;

    try {
      const group = await createGroub(newGroupName, selectedMemberIds);
      setGroups((prev) => [...prev, group]);
      setShowCreateGroup(false);
      setNewGroupName("");
      setSelectedMemberIds([]);
    } catch (e) {
      console.error("خطأ إنشاء المجموعة:", e);
    }
  };

  /* ================================================================== */
  /* UI =============================================================== */
  return (
    <>
      <Layout style={{ height: "100vh" }}>
        {/* ======= الشريط الجانبى ======= */}
        <Sider width={260} style={{ background: "#fff", padding: 16 }}>
          <Title level={4}>📁 المجموعات</Title>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            block
            style={{ marginBottom: 12 }}
            onClick={() => setShowCreateGroup(true)}
          >
            إنشاء مجموعة
          </Button>

          {/* قائمة المجموعات */}
          <Menu
            mode="inline"
            selectedKeys={[selectedGroupId?.toString()]}
            onClick={({ key }) => joinGroup(key)}
            items={groups.map((g) => ({
              key: g.id.toString(),
              icon: <TeamOutlined />,
              label: g.name,
            }))}
          />

          <Divider />

          <Title level={4}>👥 المستخدمين</Title>
          {/* قائمة المستخدمين */}
          <Menu
            mode="inline"
            selectedKeys={[selectedReceiverId?.toString()]}
            onClick={({ key }) => {
              setSelectedReceiverId(key);
              setSelectedGroupId(null);
            }}
            items={users
              .filter((u) => u.id !== currentUserId)
              .map((u) => ({
                key: u.id.toString(),
                icon: <UserOutlined />,
                label: u.email,
              }))}
          />
        </Sider>

        {/* ======= مساحة الدردشة ======= */}
        <Layout>
          <Content
            style={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            {/* قائمة الرسائل */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                background: "#fafafa",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <List
                dataSource={messages}
                renderItem={(msg) => {
                  const isMe = msg.mine;
                  const bubbleStyle = {
                    maxWidth: "70%",
                    padding: "10px 14px",
                    borderRadius: 18,
                    lineHeight: 1.5,
                    background: isMe ? "#DCF8C6" : "#FFF",
                    boxShadow: "0 0 4px rgba(0,0,0,0.05)",
                  };

                  let timeStr = "";
                  try {
                    timeStr = new Date(msg.timestamp).toLocaleString("ar-EG", {
                      dateStyle: "short",
                      timeStyle: "short",
                    });
                  } catch {
                    timeStr = msg.timestamp;
                  }

                  return (
                    <List.Item
                      style={{
                        display: "flex",
                        justifyContent: isMe ? "flex-end" : "flex-start",
                      }}
                    >
                      <div style={bubbleStyle}>
                        <div
                          style={{ fontWeight: 600, marginBottom: 4 }}
                        >
                          {isMe ? "أنا" : msg.senderName ?? msg.senderId}
                        </div>
                        <div>{msg.content}</div>
                        <div
                          style={{
                            fontSize: 12,
                            textAlign: "right",
                            color: "#666",
                            marginTop: 6,
                          }}
                        >
                          {timeStr}
                        </div>
                      </div>
                    </List.Item>
                  );
                }}
              />
              <div ref={bottomRef} />
            </div>

            {/* مربع الكتابة */}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <TextArea
                rows={1}
                placeholder="اكتب رسالة..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onPressEnter={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                style={{ resize: "none" }}
              />
              <Button
                type="primary"
                icon={<MessageOutlined />}
                onClick={sendMessage}
              >
                إرسال
              </Button>
            </div>
          </Content>
        </Layout>
      </Layout>

      {/* نافذة إنشاء مجموعة */}
      <Modal
        title="إنشاء مجموعة جديدة"
        open={showCreateGroup}
        onCancel={() => setShowCreateGroup(false)}
        onOk={handleCreateGroup}
        okText="إنشاء"
        cancelText="إلغاء"
      >
        <Input
          placeholder="اسم المجموعة"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
        />

        <div style={{ marginTop: 16 }}>
          <label>اختر الأعضاء:</label>
          <Checkbox.Group
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 8,
              maxHeight: 200,
              overflowY: "auto",
            }}
            value={selectedMemberIds}
            onChange={(ids) => setSelectedMemberIds(ids)}
          >
            {users
              .filter((u) => u.id !== currentUserId)
              .map((u) => (
                <Checkbox key={u.id} value={u.id}>
                  {u.email}
                </Checkbox>
              ))}
          </Checkbox.Group>
        </div>
      </Modal>
    </>
  );
}
