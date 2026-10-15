const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
  userMsg: { type: String, required: true },
  botReply: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const remarksSchema = new mongoose.Schema({
  remark: String,
  timestamp: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  username: { type: String },
  useremail: { type: String, unique: true, required: true },
  userNumber: { type: String, required: true, unique: true }, 
  password: { type: String },
  role: { 
    type: String, 
    enum: ["admin", "user", "cert"],
    default: "user"
  }
});


const InternSchema = new mongoose.Schema({
  salutation: { type: String, trim: true, default: "" },
  userName: { type: String, trim: true, default: "" },
  userEmail: { type: String, trim: true, lowercase: true, default: "" },
  phone: { type: String, trim: true, default: "" },
  reg_no: { type: String, trim: true, default: "" },
  year_of_study: { type: String, trim: true, default: "" },
  college: { type: String, trim: true, default: "" },
  college_location: { type: String, trim: true, default: "" },
  degree: { type: String, trim: true, default: "" },
  other_degree: { type: String, trim: true, default: "" },
  department: { type: String, trim: true, default: "" },
  internship: { type: String, trim: true, default: "" },
  other_internship: { type: String, trim: true, default: "" },
  workshop: { type: String, trim: true, default: "" },
  other_workshop: { type: String, trim: true, default: "" },
  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },
  issue_date: { type: Date, default: null },
  company: { type: String, trim: true, default: "" },
  batch_code: { type: String, trim: true, default: "" }
}, { timestamps: true });



const feesSchema = new mongoose.Schema({
  billedAmount: { type: Number, default: 0 },
  billedAt: { type: Date, default: null },
  updatedAt: { type: Date, default: null },
  installments: [
    {
      number: Number,
      dueDate: Date,
      amount: Number,
      status: {
        type: String,
        enum: ["Pending", "Paid"],
        default: "Pending"
      },
         billGenerated: { type: Boolean, default: false },
         billGeneratedAt: { type: Date, default: null },
         billUrl: { type: String, default: null },
         paidAt: { type: Date, default: null }
    }
  ]
});

const chatSchema = new mongoose.Schema({
  userName: { type: String },
  userNumber: { type: String, required: true, unique: true },
  courseofintrest: { type: String },
  course: { type: String, default: null },
  leadfrom: { type: String },
  assignedto: { type: String },
  batchId: { type: String, default: null },
  conversations: [conversationSchema],
  programType: { type: String },
  city: { type: String },
  profession: { type: String },
  location: { type: String },
  status: { type: String, default: "Cold" },
  pipeline: { type: String, default: "New" },
  remarks: [remarksSchema],
  reminder: { type: Date, default: null },
  batchId: { type: String, default: null },
  Trainer: { type: String, default: null },
  batch_date : { type: String, default: null },
  fees: { type: feesSchema, default: () => ({}) },
  followUpCount: { type: Number, default: 0 },
  respondedAfterFollowUp: { type: Boolean, default: false },
  lastFollowUpSentAt: { type: Date, default: null },
  datecreated: { type: Date, default: Date.now },
  lastInteracted: { type: Date, default: Date.now },
  aiAnalysis: { type: Object, default: null },
  InternDetails : [InternSchema],
  certificates: [
    {
      success: { type: Boolean, default: false },
      fileName: { type: String, default: null },
      message: { type: String, default: null },
      s3: { type: mongoose.Schema.Types.Mixed, default: null }
    }
  ],
  is_leader : { type: Boolean, default: false },
  date_scheduled: { type: Date, default: null }
});

// --- Static Method for Round Robin Assignment ---
chatSchema.statics.getNextAssignee = async function() {
  const User = mongoose.model("User");
  const db = mongoose.connection.db;
  const excludedConfig = db
    ? await db.collection('configs').findOne({ key: 'auto_assign_excluded_staffs' })
    : null;
  const excludedStaffs = Array.isArray(excludedConfig?.value) ? excludedConfig.value : [];
  const staffs = await User.find({
    role: 'user',
    username: { $nin: excludedStaffs }
  }).sort({ username: 1 });
  if (staffs.length === 0) return null;

  const staffUsernames = staffs.map(s => s.username);

  // Find the last lead assigned to one of our active staff members
  const lastAssignedLead = await this.findOne({ assignedto: { $in: staffUsernames } })
    .sort({ datecreated: -1 });

  if (!lastAssignedLead || !lastAssignedLead.assignedto) return staffs[0].username;

  const lastIndex = staffUsernames.indexOf(lastAssignedLead.assignedto);
  const nextIndex = (lastIndex + 1) % staffs.length;
  // console.log(staffs[nextIndex].username)
  return staffs[nextIndex].username;
};

// --- Pre-Save Hook for Auto Assignment ---
chatSchema.pre('save', async function(next) {
  if (this.isNew && (!this.assignedto || this.assignedto.trim() === "")) {
    try {
      const db = mongoose.connection.db;
      if (db) {
        const config = await db.collection('configs').findOne({ key: 'auto_assign_enabled' });
        const autoAssignEnabled = config ? !!config.value : true;

        if (autoAssignEnabled) {
          const assignee = await this.constructor.getNextAssignee();
          if (assignee) {
            this.assignedto = assignee;
          }
        }
      }
    } catch (err) {
      console.error("Auto-assign hook error:", err);
    }
  }
  next();
});


chatSchema.pre("findOneAndUpdate", async function (next) {
  // get the document BEFORE update
  const docToUpdate = await this.model.findOne(this.getQuery()).lean();

  // store previous value on the query object
  this._oldAssignedTo = docToUpdate?.assignedto;

  next();
});


chatSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc) return;

  const update = this.getUpdate();

  // 🧠 safely extract assignedto
  const newAssignedTo =
    update?.$set?.assignedto ??
    update?.assignedto ??
    null;

  // 🔐 if assignedto not part of update → DO NOTHING
  if (newAssignedTo === null) return;

  const oldAssignedTo = this._oldAssignedTo;

  // 🔐 notify ONLY if value actually changed
  if (!oldAssignedTo || oldAssignedTo === newAssignedTo) return;

  try {
    await NotifyCounsellor({
      leadId: doc._id,
      assignedTo: newAssignedTo,
      userNumber: doc.userNumber,
      userName: doc.userName,
      message: `Lead assigned to ${newAssignedTo}`
    });
  } catch (err) {
    console.error("NotifyCounsellor failed:", err);
  }
});

chatSchema.post("save", async function (doc) {
  // 🔐 notify ONLY when document is newly created
  if (!this.isNew) return;

  try {
    await NotifyCounsellor({
      leadId: doc._id,
      assignedTo: doc.assignedto,
      userNumber: doc.userNumber,
      userName: doc.userName,
      message: `New lead assigned to ${doc.assignedto}`
    });
  } catch (err) {
    console.error("NotifyCounsellor failed:", err);
  }
});

async function NotifyCounsellor(body) {
  console.log("Notify payload:", body);
  console.log("AssignedTo:", body.assignedTo);

  const response = await fetch(
    `${process.env.WP_CHAT_SERVICE_URL}/notify/crm`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );

  const data = await response.json();
  console.log("Microservice response:", data);

  return data;
}


const trainerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  batchIds: [{ type: String }]
});

const trainerTaskSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  trainerId: { type: String, required: true },
  batchId: { type: String },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  driveLink: { type: String, default: '' },
  studentRemark: { type: String, default: '' },
  trainerRemark: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const trainerTopicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  trainerId: { type: String, required: true },
  batchId: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const trainerTopicFeedbackSchema = new mongoose.Schema({
  topicId: { type: String, required: true },
  studentId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  updatedAt: { type: Date, default: Date.now }
});

const announcementSchema = new mongoose.Schema({
  trainerId: { type: String, required: true },
  batchId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const attendanceSchema = new mongoose.Schema({
  trainerId: { type: String, required: true },
  batchId: { type: String, required: true },
  date: { type: Date, default: Date.now },
  studentId: { type: String, required: true },
  status: { type: String, enum: ['present', 'absent', 'late'], default: 'absent' },
  topicId: { type: String, default: null }
});

const User = mongoose.model("User", userSchema);
const Chat = mongoose.model("Chat", chatSchema);
const Trainer = mongoose.model("Trainer", trainerSchema);
const TrainerTask = mongoose.model("TrainerTask", trainerTaskSchema);
const TrainerTopic = mongoose.model("TrainerTopic", trainerTopicSchema);
const TrainerTopicFeedback = mongoose.model("TrainerTopicFeedback", trainerTopicFeedbackSchema);
const Announcement = mongoose.model("Announcement", announcementSchema);
const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = { User, Chat, Trainer, TrainerTask, TrainerTopic, TrainerTopicFeedback, Announcement, Attendance };



require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();
const cors = require("cors");
const { User, Chat, Trainer: TrainerModel } = require("./Schema");
const jwt = require('jsonwebtoken');
const cookieParser = require("cookie-parser");
const { generateAndSendBill, deleteBill } = require("./billUtils");
const { generateCertificates, deleteFromS3, generateCombinedCertificate } = require("./certificateGenerator");
app.use(cookieParser());
app.use(bodyParser.json());
const { Configuration, OpenAIApi } = require("openai");
const OpenAI = require("openai");

const dns  = require("dns");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const openai = new OpenAI({
apiKey : process.env.OPENAI_API_KEY,});

const corsOptions = {
  origin: [
    'http://localhost:4200',
    'https://shadowcarsfe.vercel.app',
    'https://sharan002.github.io',
    'http://127.0.0.1:5500',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://appincoimbatore.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// ✅ APPLY FIRST
app.use(cors(corsOptions));

// ✅ EXPLICITLY HANDLE PREFLIGHT
app.options('*', cors(corsOptions));

// Body parsers after CORS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 4000;
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));
// Get all users
app.get("/users", async (req, res) => {
  try {
    const users = await User.find({})
      .sort({ lastInteracted: -1 });

    const leads = await Chat.find({})
      .sort({ datecreated: -1 });
    console.log("From CRM backend")
    return res.status(200).json({
      success: true,
      users,
      leads
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Update user (General update for status, assignee, reminder, etc.)
app.put("/Users", async (req, res) => {
  const updatedChat = req.body;
  if (!updatedChat._id) return res.status(400).json({ error: "_id required" });
  try {
    const chat = await Chat.findByIdAndUpdate(updatedChat._id, updatedChat, { new: true });
    if (!chat) return res.status(404).json({ error: "User not found" });
    res.json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});



// --------------------------------------------
// 🔐 JWT Functions
// --------------------------------------------
const createAccessToken = (user) => {
  console.log("Access")
  return jwt.sign(
    { id: user._id, role: user.role },
    "ACCESS_SECRET_123",
    { expiresIn: "20y" }
  );
};

const createRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    "REFRESH_SECRET_123",
    { expiresIn: "7d" }
  );
};

// --------------------------------------------
// 🛡 Auth Middleware
// --------------------------------------------
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, "ACCESS_SECRET_123");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};


// --------------------------------------------
// 🔄 Refresh Token Route
// --------------------------------------------
app.post("/refresh", (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token)
    return res.status(401).json({ message: "No refresh token" });

  jwt.verify(token, "REFRESH_SECRET_123", (err, data) => {
    if (err)
      return res.status(403).json({ message: "Invalid refresh token" });

    const newAccessToken = jwt.sign(
      { id: data.id },
      "ACCESS_SECRET_123",
      { expiresIn: "15m" }
    );

    res.json({ accessToken: newAccessToken });
  });
});


// app.post("/leads/analyze/:id", async (req, res) => {
//   try {
//     const leadId = req.params.id;
//     const lead = await Chat.findById(leadId);

//     if (!lead) {
//       return res.status(404).json({
//         success: false,
//         message: "Lead not found"
//       });
//     }

//     // Safe guards for undefined arrays
//     const remarksText = (lead.remarks || [])
//       .map(r => `[${r.timestamp}] ${r.remark}`)
//       .join("\n");

//     const conversationsText = (lead.conversations || [])
//       .map(c => `User: ${c.userMsg}\nBot: ${c.botReply}`)
//       .join("\n---\n");

//     const prompt = `
// Analyze the following lead based on their remarks and conversation history.

// Lead Details:
// - Name: ${lead.userName}
// - Course of Interest: ${lead.courseofintrest}
// - Current Status: ${lead.status}
// - Pipeline Stage: ${lead.pipeline}

// Remarks History:
// ${remarksText || "No remarks available."}

// Conversation History:
// ${conversationsText || "No conversation history available."}

// Return ONLY valid JSON with:
// {
//   "summary": "",
//   "intentScore": 0,
//   "buyingSignals": [],
//   "objections": [],
//   "recommendedAction": "",
//   "suggestedMessage": ""
// }
// `;

//     // ✅ Works with your OpenAI setup
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         { role: "system", content: "You are an expert sales analyst assistant." },
//         { role: "user", content: prompt }
//       ],
//       response_format: { type: "json_object" }
//     });

//     const analysisResult = JSON.parse(
//       completion.choices[0].message.content
//     );

//     // Save AI analysis
//     lead.aiAnalysis = analysisResult;
//     await lead.save();

//     res.json({
//       success: true,
//       analysis: analysisResult
//     });

//   } catch (error) {
//     console.error("Error analyzing lead:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to analyze lead",
//       error: error.message
//     });
//   }
// });



function cleanIndianMobileNumber(input) {
  if (!input) return null;

  let digits = input.toString().replace(/\D/g, '');

  if (digits.startsWith("91") && digits.length === 12) {
    return digits;
  }

  if (digits.length === 10) {
    return "91" + digits;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return "91" + digits.slice(1);
  }

  return digits;
}

const getNextAssignee = async () => {
  const db = mongoose.connection.db;
  const excludedConfig = db
    ? await db.collection('configs').findOne({ key: 'auto_assign_excluded_staffs' })
    : null;
  const excludedStaffs = Array.isArray(excludedConfig?.value) ? excludedConfig.value : [];
  const staffs = await User.find({
    role: 'user',
    username: { $nin: excludedStaffs }
  }).sort({ username: 1 });
  if (staffs.length === 0) return null;

  // Find the last lead that was assigned to someone
  const staffUsernames = staffs.map(s => s.username);
  const lastAssignedLead = await Chat.findOne({ assignedto: { $in: staffUsernames } })
    .sort({ datecreated: -1 });

  if (!lastAssignedLead || !lastAssignedLead.assignedto) return staffs[0].username;

  const lastIndex = staffUsernames.indexOf(lastAssignedLead.assignedto);
  const nextIndex = (lastIndex + 1) % staffs.length;
  return staffs[nextIndex].username;
};

const getAutoAssignSetting = async () => {
  const collection = mongoose.connection.db.collection('configs');
  const config = await collection.findOne({ key: 'auto_assign_enabled' });
  return config ? config.value : true; // Default to true
};

const getAutoAssignExcludedStaffs = async () => {
  const collection = mongoose.connection.db.collection('configs');
  const config = await collection.findOne({ key: 'auto_assign_excluded_staffs' });
  return Array.isArray(config?.value) ? config.value : [];
};


app.get("/settings", auth, async (req, res) => {
  try {
    const collection = mongoose.connection.db.collection('configs');
    const config = await collection.findOne({ key: 'auto_assign_enabled' });
    const autoAssign = config ? !!config.value : true;
    res.json({ success: true, autoAssign });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.post("/settings", auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
  try {
    const { autoAssign } = req.body;
    const collection = mongoose.connection.db.collection('configs');
    await collection.updateOne(
      { key: 'auto_assign_enabled' },
      { $set: { value: autoAssign } },
      { upsert: true }
    );
    res.json({ success: true, message: `Auto-Assign turned ${autoAssign ? 'ON' : 'OFF'}` });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.get("/settings/auto-assign-staffs", auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: "Admin access required" });
  try {
    const staffs = await User.find({ role: 'user' }).sort({ username: 1 }).select('username -_id');
    const staffUsernames = staffs.map(staff => staff.username).filter(Boolean);
    const excludedStaffs = (await getAutoAssignExcludedStaffs())
      .filter(username => staffUsernames.includes(username));

    res.json({ success: true, staffs: staffUsernames, excludedStaffs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load auto-assign staffs" });
  }
});

app.post("/settings/auto-assign-staffs", auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: "Admin access required" });
  try {
    const staffs = await User.find({ role: 'user' }).select('username -_id');
    const validStaffs = new Set(staffs.map(staff => staff.username).filter(Boolean));
    const excludedStaffs = Array.isArray(req.body.excludedStaffs)
      ? [...new Set(req.body.excludedStaffs.filter(username => validStaffs.has(username)))]
      : [];

    const collection = mongoose.connection.db.collection('configs');
    await collection.updateOne(
      { key: 'auto_assign_excluded_staffs' },
      { $set: { value: excludedStaffs } },
      { upsert: true }
    );

    res.json({ success: true, message: "Auto-assign staff preferences updated", excludedStaffs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update auto-assign staffs" });
  }
});


app.post("/leads/distribute", auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
  try {
    const unassignedLeads = await Chat.find({ 
      $or: [{ assignedto: { $exists: false } }, { assignedto: null }, { assignedto: "" }] 
    }).sort({ datecreated: 1 });

    if (unassignedLeads.length === 0) return res.json({ success: true, message: "No unassigned leads found." });

    const excludedStaffs = await getAutoAssignExcludedStaffs();
    const staffs = await User.find({
      role: 'user',
      username: { $nin: excludedStaffs }
    }).sort({ username: 1 });
    if (staffs.length === 0) return res.status(400).json({ message: "No selected staff members available for assignment." });

    let startIndex = 0;
    const staffUsernames = staffs.map(staff => staff.username);
    const lastAssignedLead = await Chat.findOne({ assignedto: { $in: staffUsernames } }).sort({ datecreated: -1 });
    if (lastAssignedLead) {
      startIndex = (staffs.findIndex(s => s.username === lastAssignedLead.assignedto) + 1) % staffs.length;
    }

    for (let i = 0; i < unassignedLeads.length; i++) {
      const staff = staffs[(startIndex + i) % staffs.length];
      await Chat.findByIdAndUpdate(unassignedLeads[i]._id, { assignedto: staff.username });
    }

    res.json({ success: true, message: `Distributed ${unassignedLeads.length} leads across ${staffs.length} staff.` });
  } catch (err) {
    res.status(500).json({ message: "Distribution failed." });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username, password });

    if (!user) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const accessToken = createAccessToken(user);

    return res.json({
      success: true,
      accessToken,   // send access token to frontend
      user,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


app.post("/dashboard", auth, async (req, res) => {
    
    const { username, includeLeads = true } = req.body;

    // 1️⃣ Validate user
    const user = await User.findOne({ username });

  
  let leads = [];

    // 3️⃣ Fetch leads based on role
    if (user.role === "user") {
      const scope = { assignedto: user.username };

      if (!includeLeads) {
        const [enrolledCount, internshipEnrolledCount, notInterestedCount, remindersCount] =
          await Promise.all([
            Chat.countDocuments({ ...scope, pipeline: "Enrolled" }),
            Chat.countDocuments({ ...scope, pipeline: "Enrolled", course: { $regex: /^college internship$/i } }),
            Chat.countDocuments({ ...scope, pipeline: { $in: [/^not interested$/i, /^not intrested$/i] } }),
            Chat.countDocuments({ ...scope, reminder: { $ne: null } }),
          ]);

        return res.json({
          success: true,
          user,
          counts: { enrolledCount, internshipEnrolledCount, notInterestedCount, remindersCount },
        });
      }

      leads = await Chat.find(scope).sort({ datecreated: -1 });
      return res.json({ success: true, user, leads });
    } 
    else if (user.role === "admin") {
      const staffs = await User.find(
        { role: { $ne: "admin" } },
        { userNumber: 1, useremail: 1, username: 1, _id: 0 }
      );

      if (!includeLeads) {
        const [enrolledCount, internshipEnrolledCount, notInterestedCount, remindersCount] =
          await Promise.all([
            Chat.countDocuments({ pipeline: "Enrolled" }),
            Chat.countDocuments({ pipeline: "Enrolled", course: { $regex: /^college internship$/i } }),
            Chat.countDocuments({ pipeline: { $in: [/^not interested$/i, /^not intrested$/i] } }),
            Chat.countDocuments({ reminder: { $ne: null } }),
          ]);

        return res.json({
          success: true,
          user,
          staffs,
          counts: { enrolledCount, internshipEnrolledCount, notInterestedCount, remindersCount },
        });
      }

      leads = await Chat.find({}).sort({ datecreated: -1 });
      return res.json({ success: true, user, leads, staffs });
    } 
    else {
      return res.json({
        success: false,
        message: "Invalid role"
      });
    }

});

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildLeadMatch({ view, searchQuery, filters, scope, ignoreStatusFilter = false }) {
  const match = { ...(scope || {}) };
  const and = [];

  const viewKey = (view || "dashboard").toLowerCase();
  if (viewKey === "dashboard") {
    and.push({ pipeline: { $nin: ["Enrolled", /^not interested$/i, /^not intrested$/i] } });
  } else if (viewKey === "enrolled" || viewKey === "fees") {
    and.push({ pipeline: "Enrolled" });
  } else if (viewKey === "internship-enrolled") {
    and.push({ pipeline: "Enrolled" });
    and.push({ course: { $regex: /^college internship$/i } });
  } else if (viewKey === "not-interested") {
    and.push({ pipeline: { $in: [/^not interested$/i, /^not intrested$/i] } });
  } else if (viewKey === "reminders") {
    and.push({ reminder: { $ne: null } });
  }

  const q = (searchQuery || "").trim();
  if (q) {
    const safe = escapeRegex(q);
    match.$or = [
      { userName: { $regex: safe, $options: "i" } },
      { userNumber: { $regex: safe, $options: "i" } },
    ];
  }

  const f = filters || {};

  if (Array.isArray(f.courses) && f.courses.length > 0) {
    and.push({ course: { $in: f.courses.map(c => new RegExp(`^${escapeRegex(c)}$`, "i")) } });
  }
  if (Array.isArray(f.programTypes) && f.programTypes.length > 0) {
    and.push({ programType: { $in: f.programTypes.map(p => new RegExp(`^${escapeRegex(p)}$`, "i")) } });
  }
  if (Array.isArray(f.professions) && f.professions.length > 0) {
    and.push({ profession: { $in: f.professions.map(p => new RegExp(`^${escapeRegex(p)}$`, "i")) } });
  }
  if (Array.isArray(f.sources) && f.sources.length > 0) {
    and.push({ leadfrom: { $in: f.sources.map(s => new RegExp(escapeRegex(s), "i")) } });
  }
  if (Array.isArray(f.statuses) && f.statuses.length > 0) {
    and.push({ status: { $in: f.statuses.map(s => new RegExp(`^${escapeRegex(s)}$`, "i")) } });
  }
  if (Array.isArray(f.pipelines) && f.pipelines.length > 0) {
    and.push({ pipeline: { $in: f.pipelines.map(p => new RegExp(`^${escapeRegex(p)}$`, "i")) } });
  }
  if (Array.isArray(f.assignedUsers) && f.assignedUsers.length > 0) {
    and.push({ assignedto: { $in: f.assignedUsers } });
  }

  if (f.fromDate || f.toDate) {
    const from = f.fromDate ? new Date(f.fromDate) : null;
    const to = f.toDate ? new Date(f.toDate) : null;
    const range = {};
    if (from && !isNaN(from.getTime())) range.$gte = from;
    if (to && !isNaN(to.getTime())) range.$lte = new Date(to.getTime() + 86400000 - 1);
    if (Object.keys(range).length > 0) and.push({ datecreated: range });
  }

  const statusFilter = ignoreStatusFilter ? null : f.statusFilter;
  if (statusFilter === "unassigned") {
    and.push({ $or: [{ assignedto: { $exists: false } }, { assignedto: null }, { assignedto: "" }] });
  } else if (statusFilter === "no-remarks") {
    and.push({ $or: [{ remarks: { $exists: false } }, { remarks: { $size: 0 } }] });
  } else if (statusFilter === "responded") {
    and.push({ respondedAfterFollowUp: true });
  } else if (statusFilter === "hot" || statusFilter === "warm" || statusFilter === "cold") {
    and.push({ status: new RegExp(`^${escapeRegex(statusFilter)}$`, "i") });
  }

  // Internship filters (best-effort, matches any InternDetails entry)
  if (f.college) and.push({ "InternDetails.college": new RegExp(`^${escapeRegex(f.college)}$`, "i") });
  if (f.batch) and.push({ "InternDetails.batch_code": new RegExp(`^${escapeRegex(f.batch)}$`, "i") });
  if (f.assignedUser) and.push({ assignedto: new RegExp(`^${escapeRegex(f.assignedUser)}$`, "i") });
  if (f.source) and.push({ leadfrom: new RegExp(`^${escapeRegex(f.source)}$`, "i") });

  if (and.length > 0) {
    match.$and = (match.$and || []).concat(and);
  }

  return match;
}

app.post("/leads/query", auth, async (req, res) => {
  try {
    const {
      view = "dashboard",
      searchQuery = "",
      filters = {},
      page = 1,
      limit = 50,
      includeStats = true,
      mode = "summary",
    } = req.body || {};

    const currentUser = await User.findById(req.user?.id).lean();
    if (!currentUser) return res.status(401).json({ success: false, message: "Unauthorized" });

    const scope = currentUser.role === "user" ? { assignedto: currentUser.username } : {};

    const parsedLimit = Math.max(1, Math.min(500, Number(limit) || 50));
    const parsedPage = Math.max(1, Number(page) || 1);

    const matchFiltered = buildLeadMatch({ view, searchQuery, filters, scope, ignoreStatusFilter: false });
    const matchBaseForStats = buildLeadMatch({ view, searchQuery, filters, scope, ignoreStatusFilter: true });

    const projection = mode === "full" ? undefined : "-conversations -aiAnalysis -InternDetails -certificates";

    const [leads, totalFiltered, statsAgg] = await Promise.all([
      Chat.find(matchFiltered)
        .sort({ datecreated: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .select(projection)
        .lean(),
      Chat.countDocuments(matchFiltered),
      includeStats
        ? Chat.aggregate([
            { $match: matchBaseForStats },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                cold: { $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "cold"] }, 1, 0] } },
                warm: { $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "warm"] }, 1, 0] } },
                hot: { $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "hot"] }, 1, 0] } },
                unassigned: {
                  $sum: { $cond: [{ $or: [{ $eq: ["$assignedto", null] }, { $eq: ["$assignedto", ""] }] }, 1, 0] },
                },
                noRemarks: {
                  $sum: { $cond: [{ $eq: [{ $size: { $ifNull: ["$remarks", []] } }, 0] }, 1, 0] },
                },
                responded: { $sum: { $cond: [{ $eq: ["$respondedAfterFollowUp", true] }, 1, 0] } },
              },
            },
          ])
        : Promise.resolve([]),
    ]);

    const statsRow = includeStats && Array.isArray(statsAgg) && statsAgg[0] ? statsAgg[0] : null;

    return res.json({
      success: true,
      leads,
      total: totalFiltered,
      stats: statsRow
        ? {
            total: statsRow.total || 0,
            cold: statsRow.cold || 0,
            warm: statsRow.warm || 0,
            hot: statsRow.hot || 0,
            unassigned: statsRow.unassigned || 0,
            noRemarks: statsRow.noRemarks || 0,
            responded: statsRow.responded || 0,
          }
        : null,
    });
  } catch (err) {
    console.error("leads/query error:", err);
    return res.status(500).json({ success: false, message: "Failed to query leads" });
  }
});

app.get("/leads/:id", auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user?.id).lean();
    if (!currentUser) return res.status(401).json({ success: false, message: "Unauthorized" });

    const lead = await Chat.findById(req.params.id).lean();
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    if (currentUser.role === "user" && lead.assignedto !== currentUser.username) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.json({ success: true, lead });
  } catch (err) {
    console.error("GET /leads/:id error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch lead" });
  }
});

app.post("/fees/stats", auth, async (req, res) => {
  try {
    const { searchQuery = "", filters = {} } = req.body || {};

    const currentUser = await User.findById(req.user?.id).lean();
    if (!currentUser) return res.status(401).json({ success: false, message: "Unauthorized" });

    const scope = currentUser.role === "user" ? { assignedto: currentUser.username } : {};

    const match = buildLeadMatch({
      view: "fees",
      searchQuery,
      filters: { ...filters, statusFilter: null },
      scope,
      ignoreStatusFilter: true,
    });

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [raw, overallAgg] = await Promise.all([
      Chat.aggregate([
        { $match: match },
        { $match: { datecreated: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { year: { $year: "$datecreated" }, month: { $month: "$datecreated" } },
            billed: { $sum: { $ifNull: ["$fees.billedAmount", 0] } },
            paid: {
              $sum: {
                $reduce: {
                  input: { $ifNull: ["$fees.installments", []] },
                  initialValue: 0,
                  in: {
                    $cond: [
                      { $eq: ["$$this.status", "Paid"] },
                      { $add: ["$$value", { $ifNull: ["$$this.amount", 0] }] },
                      "$$value",
                    ],
                  },
                },
              },
            },
            installmentCount: {
              $sum: { $size: { $ifNull: ["$fees.installments", []] } },
            },
          },
        },
      ]),
      Chat.aggregate([
        { $match: match },
        {
          $project: {
            billed: { $ifNull: ["$fees.billedAmount", 0] },
            installments: { $ifNull: ["$fees.installments", []] },
          },
        },
        {
          $project: {
            billed: 1,
            installmentCount: { $size: "$installments" },
            paid: {
              $sum: {
                $map: {
                  input: "$installments",
                  as: "i",
                  in: { $cond: [{ $eq: ["$$i.status", "Paid"] }, { $ifNull: ["$$i.amount", 0] }, 0] },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            billed: { $sum: "$billed" },
            paid: { $sum: "$paid" },
            installmentCount: { $sum: "$installmentCount" },
          },
        },
        {
          $project: {
            _id: 0,
            billed: 1,
            paid: 1,
            pending: { $subtract: ["$billed", "$paid"] },
            installmentCount: 1,
          },
        },
      ]),
    ]);

    const byKey = new Map();
    for (const row of raw) {
      const year = row._id.year;
      const monthIndex = row._id.month - 1;
      const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
      const paid = Number(row.paid) || 0;
      const billed = Number(row.billed) || 0;
      byKey.set(key, {
        year,
        month: monthIndex,
        billed,
        paid,
        pending: billed - paid,
        installmentCount: Number(row.installmentCount) || 0,
      });
    }

    const months = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push(
        byKey.get(key) || {
          year: d.getFullYear(),
          month: d.getMonth(),
          billed: 0,
          paid: 0,
          pending: 0,
          installmentCount: 0,
        }
      );
    }

    const overall = Array.isArray(overallAgg) && overallAgg[0] ? overallAgg[0] : { billed: 0, paid: 0, pending: 0, installmentCount: 0 };
    return res.json({ success: true, months, overall });
  } catch (err) {
    console.error("fees/stats error:", err);
    return res.status(500).json({ success: false, message: "Failed to compute fees stats" });
  }
});



// Add remark
app.post("/Users/remarks", async (req, res) => {
  const { _id, remark } = req.body;
  if (!_id || !remark) return res.status(400).json({ error: "_id and remark required" });
  try {
    const chat = await Chat.findById(_id);
    if (!chat) return res.status(404).json({ error: "User not found" });
    chat.remarks.push({ remark, timestamp: new Date() });
    await chat.save();
    res.json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
// Delete remark
app.delete("/Users/remarks", async (req, res) => {
  const { _id, remarkId } = req.body;
  if (!_id || !remarkId) return res.status(400).json({ error: "_id and remarkId required" });
  try {
    const chat = await Chat.findById(_id);
    if (!chat) return res.status(404).json({ error: "User not found" });
    chat.remarks = chat.remarks.filter(r => r._id.toString() !== remarkId);
    await chat.save();
    res.json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// app.get("/reports/today-user-activity", async (req, res) => {
//   try {
//     // ✅ Start & End of Today
//     const start = new Date();
//     start.setHours(0, 0, 0, 0);

//     const end = new Date();
//     end.setHours(23, 59, 59, 999);

//     const report = await Chat.aggregate([
//       {
//         $match: {
//           assignedto: { $exists: true, $ne: null }
//         }
//       },

//       // ✅ Filter today's remarks safely
//       {
//         $addFields: {
//           todaysRemarks: {
//             $filter: {
//               input: { $ifNull: ["$remarks", []] },
//               as: "remark",
//               cond: {
//                 $and: [
//                   { $gte: ["$$remark.timestamp", start] },
//                   { $lte: ["$$remark.timestamp", end] }
//                 ]
//               }
//             }
//           }
//         }
//       },

//       // ✅ Determine if fees updated today (safe check)
//       {
//         $addFields: {
//           feesUpdatedFlag: {
//             $cond: [
//               {
//                 $and: [
//                   { $ifNull: ["$fees.updatedAt", false] },
//                   { $gte: ["$fees.updatedAt", start] },
//                   { $lte: ["$fees.updatedAt", end] }
//                 ]
//               },
//               1,
//               0
//             ]
//           }
//         }
//       },

//       {
//         $group: {
//           _id: "$assignedto",

//           // ✅ New Leads Today
//           newLeadsToday: {
//             $sum: {
//               $cond: [
//                 {
//                   $and: [
//                     { $gte: ["$datecreated", start] },
//                     { $lte: ["$datecreated", end] }
//                   ]
//                 },
//                 1,
//                 0
//               ]
//             }
//           },

//           // ✅ Total Remarks Count Today
//           remarksCount: {
//             $sum: { $size: "$todaysRemarks" }
//           },

//           // ✅ Only push leads having remarks today
//           remarksDetails: {
//             $push: {
//               $cond: [
//                 { $gt: [{ $size: "$todaysRemarks" }, 0] },
//                 {
//                   userName: "$userName",
//                   userNumber: "$userNumber",
//                   remarks: "$todaysRemarks"
//                 },
//                 "$$REMOVE"
//               ]
//             }
//           },

//           // ✅ Fees updated count
//           feesUpdatedToday: {
//             $sum: "$feesUpdatedFlag"
//           },

//           // ✅ Only push fee details if updated today
//           feeDetails: {
//             $push: {
//               $cond: [
//                 { $eq: ["$feesUpdatedFlag", 1] },
//                 {
//                   userName: "$userName",
//                   userNumber: "$userNumber",
//                   billedAmount: "$fees.billedAmount",
//                   updatedAt: "$fees.updatedAt"
//                 },
//                 "$$REMOVE"
//               ]
//             }
//           }
//         }
//       },

//       {
//         $project: {
//           _id: 0,
//           username: "$_id",
//           newLeadsToday: 1,
//           remarksCount: 1,
//           feesUpdatedToday: 1,
//           remarksDetails: 1,
//           feeDetails: 1
//         }
//       },

//       { $sort: { username: 1 } }
//     ]);

//     res.json({
//       success: true,
//       date: start.toISOString().split("T")[0],
//       report
//     });

//   } catch (err) {
//     console.error("Report Error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Error generating report"
//     });
//   }
// });



app.get("/reports/today-user-activity", async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const report = await Chat.aggregate([
      {
        $match: {
          assignedto: { $exists: true, $ne: null }
        }
      },

      // ✅ Detect new lead (excludes Enrolled + College Internship)
      {
        $addFields: {
          isNewLeadToday: {
            $and: [
              { $gte: ["$datecreated", start] },
              { $lte: ["$datecreated", end] },
              {
                $not: {
                  $and: [
                    { $eq: [{ $toLower: { $ifNull: ["$pipeline", ""] } }, "enrolled"] },
                    { $eq: [{ $toLower: { $ifNull: ["$course", ""] } }, "college internship"] }
                  ]
                }
              }
            ]
          }
        }
      },

      // ✅ Filter today's remarks
      {
        $addFields: {
          todaysRemarks: {
            $filter: {
              input: { $ifNull: ["$remarks", []] },
              as: "remark",
              cond: {
                $and: [
                  { $gte: ["$$remark.timestamp", start] },
                  { $lte: ["$$remark.timestamp", end] }
                ]
              }
            }
          }
        }
      },

      // ✅ Paid installments today
      {
        $addFields: {
          paidTodayInstallments: {
            $filter: {
              input: { $ifNull: ["$fees.installments", []] },
              as: "inst",
              cond: {
                $and: [
                  { $eq: ["$$inst.status", "Paid"] },
                  { $gte: ["$$inst.paidAt", start] },
                  { $lte: ["$$inst.paidAt", end] }
                ]
              }
            }
          }
        }
      },
      {
        $addFields: {
          paidTodayAmount: {
            $sum: {
              $map: {
                input: "$paidTodayInstallments",
                as: "inst",
                in: { $ifNull: ["$$inst.amount", 0] }
              }
            }
          },
          hasPaidToday: { $gt: [{ $size: "$paidTodayInstallments" }, 0] }
        }
      },

      {
        $group: {
          _id: "$assignedto",

          // ✅ COUNT (unchanged)
          newLeadsToday: {
            $sum: {
              $cond: ["$isNewLeadToday", 1, 0]
            }
          },

          remarksCount: {
            $sum: { $size: "$todaysRemarks" }
          },

          feesUpdatedToday: {
            $sum: "$paidTodayAmount"
          },

          // 🆕 NEW LEADS DETAILS
          newLeadsDetails: {
            $push: {
              $cond: [
                "$isNewLeadToday",
                {
                  userName: "$userName",
                  userNumber: "$userNumber",
                  courseofintrest: "$courseofintrest",
                  datecreated: "$datecreated"
                },
                "$$REMOVE"
              ]
            }
          },

          // 🆕 Remarks on NEW leads
          newLeadsRemarksToday: {
            $push: {
              $cond: [
                {
                  $and: [
                    "$isNewLeadToday",
                    { $gt: [{ $size: "$todaysRemarks" }, 0] }
                  ]
                },
                {
                  userName: "$userName",
                  userNumber: "$userNumber",
                  datecreated: "$datecreated",
                  remarks: "$todaysRemarks"
                },
                "$$REMOVE"
              ]
            }
          },

          // 🔄 Remarks on OLD leads
          oldLeadsRemarksToday: {
            $push: {
              $cond: [
                {
                  $and: [
                    { $not: "$isNewLeadToday" },
                    { $gt: [{ $size: "$todaysRemarks" }, 0] }
                  ]
                },
                {
                  userName: "$userName",
                  userNumber: "$userNumber",
                  remarks: "$todaysRemarks"
                },
                "$$REMOVE"
              ]
            }
          },

          // ❗ New leads WITHOUT remarks
          newLeadsWithoutRemarks: {
            $push: {
              $cond: [
                {
                  $and: [
                    "$isNewLeadToday",
                    { $eq: [{ $size: "$todaysRemarks" }, 0] }
                  ]
                },
                {
                  userName: "$userName",
                  userNumber: "$userNumber",
                  datecreated: "$datecreated"
                },
                "$$REMOVE"
              ]
            }
          },

          // (Unchanged) remarksDetails
          remarksDetails: {
            $push: {
              $cond: [
                { $gt: [{ $size: "$todaysRemarks" }, 0] },
                {
                  userName: "$userName",
                  userNumber: "$userNumber",
                  remarks: "$todaysRemarks"
                },
                "$$REMOVE"
              ]
            }
          },

          // Paid installments fee details
          feeDetails: {
            $push: {
              $cond: [
                "$hasPaidToday",
                {
                  userName: "$userName",
                  userNumber: "$userNumber",
                  paidAmount: "$paidTodayAmount",
                  installments: "$paidTodayInstallments"
                },
                "$$REMOVE"
              ]
            }
          }
        }
      },

      {
        $project: {
          _id: 0,
          username: "$_id",
          newLeadsToday: 1,
          newLeadsDetails: 1,
          newLeadsRemarksToday: 1,
          oldLeadsRemarksToday: 1,
          newLeadsWithoutRemarks: 1,
          remarksCount: 1,
          feesUpdatedToday: 1,
          remarksDetails: 1,
          feeDetails: 1
        }
      },

      { $sort: { username: 1 } }
    ]);

    res.json({
      success: true,
      date: start.toISOString().split("T")[0],
      report
    });

  } catch (err) {
    console.error("Report Error:", err);
    res.status(500).json({
      success: false,
      message: "Error generating report"
    });
  }
});

// Date-parameterized daily report (defaults to today when no date param given)
app.get("/reports/user-activity", auth, async (req, res) => {
  try {
    const { date } = req.query;
    const currentUser = await User.findById(req.user?.id).lean();
    if (!currentUser) return res.status(401).json({ success: false, message: "Unauthorized" });

    let start, end;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      start = new Date(date);
      start.setHours(0, 0, 0, 0);
      end = new Date(date);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    const assignedMatch = currentUser.role === "admin" ? {} : { assignedto: currentUser.username };

    const report = await Chat.aggregate([
      { $match: { assignedto: { $exists: true, $ne: null }, ...assignedMatch } },
      {
        $addFields: {
          isNewLeadOnDate: {
            $and: [
              { $gte: ["$datecreated", start] },
              { $lte: ["$datecreated", end] },
              {
                $not: {
                  $and: [
                    { $eq: [{ $toLower: { $ifNull: ["$pipeline", ""] } }, "enrolled"] },
                    { $eq: [{ $toLower: { $ifNull: ["$course", ""] } }, "college internship"] }
                  ]
                }
              }
            ]
          }
        }
      },
      {
        $addFields: {
          dateRemarks: {
            $filter: {
              input: { $ifNull: ["$remarks", []] },
              as: "remark",
              cond: {
                $and: [
                  { $gte: ["$$remark.timestamp", start] },
                  { $lte: ["$$remark.timestamp", end] }
                ]
              }
            }
          }
        }
      },
      {
        $addFields: {
          paidOnDateInstallments: {
            $filter: {
              input: { $ifNull: ["$fees.installments", []] },
              as: "inst",
              cond: {
                $and: [
                  { $eq: ["$$inst.status", "Paid"] },
                  { $gte: ["$$inst.paidAt", start] },
                  { $lte: ["$$inst.paidAt", end] }
                ]
              }
            }
          },
          reminderOnDateFlag: {
            $cond: [
              {
                $and: [
                  { $ifNull: ["$reminder", false] },
                  { $gte: ["$reminder", start] },
                  { $lte: ["$reminder", end] }
                ]
              },
              1, 0
            ]
          }
        }
      },
      {
        $addFields: {
          paidOnDateAmount: {
            $sum: {
              $map: {
                input: "$paidOnDateInstallments",
                as: "inst",
                in: { $ifNull: ["$$inst.amount", 0] }
              }
            }
          },
          hasPaidOnDate: { $gt: [{ $size: "$paidOnDateInstallments" }, 0] },
          billedOnDate: {
            $and: [
              { $ifNull: ["$fees.billedAt", false] },
              { $gte: ["$fees.billedAt", start] },
              { $lte: ["$fees.billedAt", end] }
            ]
          },
          billedOnDateAmount: {
            $cond: [
              {
                $and: [
                  { $ifNull: ["$fees.billedAt", false] },
                  { $gte: ["$fees.billedAt", start] },
                  { $lte: ["$fees.billedAt", end] }
                ]
              },
              { $ifNull: ["$fees.billedAmount", 0] },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: "$assignedto",
          newLeadsToday: { $sum: { $cond: ["$isNewLeadOnDate", 1, 0] } },
          remarksCount: { $sum: { $size: "$dateRemarks" } },
          feesUpdatedToday: { $sum: "$paidOnDateAmount" },
          billedTodayTotal: { $sum: "$billedOnDateAmount" },
          remindersTodayCount: { $sum: "$reminderOnDateFlag" },
          newLeadsDetails: {
            $push: {
              $cond: [
                "$isNewLeadOnDate",
                { userName: "$userName", userNumber: "$userNumber", courseofintrest: "$courseofintrest", datecreated: "$datecreated" },
                "$$REMOVE"
              ]
            }
          },
          newLeadsRemarksToday: {
            $push: {
              $cond: [
                { $and: ["$isNewLeadOnDate", { $gt: [{ $size: "$dateRemarks" }, 0] }] },
                { userName: "$userName", userNumber: "$userNumber", datecreated: "$datecreated", remarks: "$dateRemarks" },
                "$$REMOVE"
              ]
            }
          },
          oldLeadsRemarksToday: {
            $push: {
              $cond: [
                { $and: [{ $not: "$isNewLeadOnDate" }, { $gt: [{ $size: "$dateRemarks" }, 0] }] },
                { userName: "$userName", userNumber: "$userNumber", remarks: "$dateRemarks" },
                "$$REMOVE"
              ]
            }
          },
          newLeadsWithoutRemarks: {
            $push: {
              $cond: [
                { $and: ["$isNewLeadOnDate", { $eq: [{ $size: "$dateRemarks" }, 0] }] },
                { userName: "$userName", userNumber: "$userNumber", datecreated: "$datecreated" },
                "$$REMOVE"
              ]
            }
          },
          remarksDetails: {
            $push: {
              $cond: [
                { $gt: [{ $size: "$dateRemarks" }, 0] },
                { userName: "$userName", userNumber: "$userNumber", remarks: "$dateRemarks" },
                "$$REMOVE"
              ]
            }
          },
          feeDetails: {
            $push: {
              $cond: [
                { $or: ["$hasPaidOnDate", "$billedOnDate"] },
                {
                  userName: "$userName",
                  userNumber: "$userNumber",
                  billedAmount: "$billedOnDateAmount",
                  paidAmount: "$paidOnDateAmount",
                  installments: "$paidOnDateInstallments"
                },
                "$$REMOVE"
              ]
            }
          },
          remindersTodayDetails: {
            $push: {
              $cond: [
                { $eq: ["$reminderOnDateFlag", 1] },
                { userName: "$userName", userNumber: "$userNumber", status: "$status", pipeline: "$pipeline", reminder: "$reminder" },
                "$$REMOVE"
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          username: "$_id",
          newLeadsToday: 1,
          newLeadsDetails: 1,
          newLeadsRemarksToday: 1,
          oldLeadsRemarksToday: 1,
          newLeadsWithoutRemarks: 1,
          remarksCount: 1,
          feesUpdatedToday: 1,
          billedTodayTotal: 1,
          remarksDetails: 1,
          feeDetails: 1,
          remindersTodayCount: 1,
          remindersTodayDetails: 1
        }
      },
      { $sort: { username: 1 } }
    ]);

    res.json({ success: true, date: start.toISOString().split("T")[0], report });
  } catch (err) {
    console.error("Report Error:", err);
    res.status(500).json({ success: false, message: "Error generating report" });
  }
});

// Monthly counselor performance report
app.get("/reports/monthly-activity", auth, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const currentUser = await User.findById(req.user?.id).lean();
    if (!currentUser) return res.status(401).json({ success: false, message: "Unauthorized" });

    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const assignedMatch = currentUser.role === "admin" ? {} : { assignedto: currentUser.username };

    const report = await Chat.aggregate([
      { $match: { assignedto: { $exists: true, $ne: null }, ...assignedMatch } },
      {
        $addFields: {
          isNewLeadInMonth: {
            $and: [
              { $gte: ["$datecreated", start] },
              { $lte: ["$datecreated", end] }
            ]
          },
          monthRemarks: {
            $filter: {
              input: { $ifNull: ["$remarks", []] },
              as: "remark",
              cond: {
                $and: [
                  { $gte: ["$$remark.timestamp", start] },
                  { $lte: ["$$remark.timestamp", end] }
                ]
              }
            }
          },
          feesUpdatedInMonth: {
            $cond: [
              {
                $and: [
                  { $ifNull: ["$fees.updatedAt", false] },
                  { $gte: ["$fees.updatedAt", start] },
                  { $lte: ["$fees.updatedAt", end] }
                ]
              },
              1, 0
            ]
          },
          paidInstallmentsInMonth: {
            $filter: {
              input: { $ifNull: ["$fees.installments", []] },
              as: "inst",
              cond: {
                $and: [
                  { $eq: ["$$inst.status", "Paid"] },
                  { $ifNull: ["$$inst.paidAt", false] },
                  { $gte: ["$$inst.paidAt", start] },
                  { $lte: ["$$inst.paidAt", end] }
                ]
              }
            }
          }
        }
      },
      {
        $group: {
          _id: "$assignedto",
          newLeads: { $sum: { $cond: ["$isNewLeadInMonth", 1, 0] } },
          totalRemarks: { $sum: { $size: "$monthRemarks" } },
          feesUpdated: { $sum: "$feesUpdatedInMonth" },
          totalPaid: {
            $sum: {
              $sum: {
                $map: {
                  input: "$paidInstallmentsInMonth",
                  as: "inst",
                  in: { $ifNull: ["$$inst.amount", 0] }
                }
              }
            }
          },
          totalBilled: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ifNull: ["$fees.billedAt", false] },
                    { $gte: ["$fees.billedAt", start] },
                    { $lte: ["$fees.billedAt", end] }
                  ]
                },
                { $ifNull: ["$fees.billedAmount", 0] },
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          username: "$_id",
          newLeads: 1,
          totalRemarks: 1,
          feesUpdated: 1,
          totalPaid: 1,
          totalBilled: 1
        }
      },
      { $sort: { username: 1 } }
    ]);

    res.json({ success: true, year, month, report });
  } catch (err) {
    console.error("Monthly Report Error:", err);
    res.status(500).json({ success: false, message: "Error generating monthly report" });
  }
});

// Monthly enrolled pipeline grouped by lead source
app.get("/reports/monthly-pipeline-by-source", async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const assignedto = req.query.assignedto || req.query.counsellor || req.query.username || null;
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const matchStage = {
      pipeline: "Enrolled",
      ...(assignedto ? { assignedto } : {})
    };

    const data = await Chat.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          enrolledReportDate: { $ifNull: ["$fees.billedAt", "$datecreated"] }
        }
      },
      {
        $match: {
          enrolledReportDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $ifNull: ["$leadfrom", "Unknown"] },
          count: { $sum: 1 }
        }
      },
      { $project: { _id: 0, label: "$_id", count: 1 } },
      { $sort: { count: -1 } }
    ]);

    res.json({ success: true, year, month, data });
  } catch (err) {
    console.error("Pipeline By Source Error:", err);
    res.status(500).json({ success: false, message: "Error generating pipeline by source report" });
  }
});

// Monthly enrolled pipeline grouped by course
app.get("/reports/monthly-pipeline-by-course", async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const assignedto = req.query.assignedto || req.query.counsellor || req.query.username || null;
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const matchStage = {
      pipeline: "Enrolled",
      ...(assignedto ? { assignedto } : {})
    };

    const data = await Chat.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          enrolledReportDate: { $ifNull: ["$fees.billedAt", "$datecreated"] }
        }
      },
      {
        $match: {
          enrolledReportDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $ifNull: ["$course", "Not Specified"] },
          count: { $sum: 1 }
        }
      },
      { $project: { _id: 0, label: "$_id", count: 1 } },
      { $sort: { count: -1 } }
    ]);

    res.json({ success: true, year, month, data });
  } catch (err) {
    console.error("Pipeline By Course Error:", err);
    res.status(500).json({ success: false, message: "Error generating pipeline by course report" });
  }
});

app.put("/Users/edit", async (req, res) => {
  // console.log(req.body)
  try {
    const {
      _id,
      course,
      leadfrom,
      pipeline,
      profession,
      programType,
      status,
      userName,
      location,
      userNumber
    } = req.body;

    if (!_id) {
      return res.status(400).json({ message: "User ID missing!" });
    }

    // 1️⃣ Get existing user
    const existingUser = await Chat.findById(_id);

    if (!existingUser) {
      return res.status(404).json({ message: "User not found!" });
    }
    
    const oldPipeline = existingUser.pipeline;

    // console.log(oldPipeline)

    // 2️⃣ Prepare update object (avoid overwriting with undefined)
    const updateData = {
      course,
      leadfrom,
      pipeline,
      profession,
      programType,
      status,
      userName,
      location,
      userNumber
    };

    // remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    // 3️⃣ Update user
    const updatedUser = await Chat.findByIdAndUpdate(
      _id,
      updateData,
      { new: true }
    );

    console.log(pipeline)

    // 4️⃣ Trigger microservice ONLY when pipeline changed to enrolled
    if (
      pipeline &&
      pipeline === "Enrolled" &&
      oldPipeline !== "Enrolled"
    ) {
      try {
        console.log("Enrollment triggered");

await fetch(`${process.env.WP_CHAT_SERVICE_URL}/new/enrollment`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    userId: updatedUser._id,
    userName: updatedUser.userName,
    userNumber: updatedUser.userNumber,
    course: updatedUser.course,
    programType: updatedUser.programType
  })
});

        console.log("Enrollment data sent to microservice");
      } catch (microErr) {
        console.error("Microservice call failed:", microErr.message);
      }
    }

    res.json(updatedUser);

  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.post("/add", async (req, res) => {
  try {
    const { userName, userNumber, course, location, leadfrom, profession, status, programType, pipeline, assignedto } = req.body;

    if (!userNumber) return res.status(400).json({ message: "Phone number is required." });

    const sanitizedNumber = userNumber.replace(/\D/g, "");
    if (sanitizedNumber.length !== 10) return res.status(400).json({ message: "Phone number must be exactly 10 digits." });

    const fullNumber = sanitizedNumber.startsWith("91") ? sanitizedNumber : "91" + sanitizedNumber;

    // LeadAddNotification(fullNumber)
    let userChat = await Chat.findOne({ userNumber: fullNumber });
    if (userChat) return res.status(400).json({ message: "User already exists." });

    // Assignment Logic: 
    // 1. If assignedto is provided (manual entry), use it.
    // 2. Otherwise, check if Auto-Assign is enabled.
    // 3. If enabled, use Round Robin. If disabled, leave as unassigned.

    userChat = new Chat({
      userNumber: fullNumber,
      userName: userName?.trim() || "Unknown",
      conversations: [],
      course: course || null,
      location: location || null,
      profession: profession || null,
      programType: programType || null,
      status: status || "Cold",
      pipeline: pipeline || "New",
      lastInteracted: new Date(),
      leadfrom: leadfrom || "Walkin",
       assignedto: assignedto || undefined,
      datecreated: new Date()
    });

    await userChat.save();
    await LeadAddNotification(fullNumber)
    return res.status(200).json({ success: true, message: "Lead added.", user: userChat });
  } catch (err) {
    console.error("❌ Error adding user:", err);
    return res.status(500).json({ message: "Internal Server Error." });
  }
});

app.post("/leads/distribute", auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
  try {
    const unassignedLeads = await Chat.find({ 
      $or: [{ assignedto: { $exists: false } }, { assignedto: null }, { assignedto: "" }] 
    }).sort({ datecreated: 1 });

    if (unassignedLeads.length === 0) return res.json({ success: true, message: "No unassigned leads found." });

    const excludedStaffs = await getAutoAssignExcludedStaffs();
    const staffs = await User.find({
      role: 'user',
      username: { $nin: excludedStaffs }
    }).sort({ username: 1 });
    if (staffs.length === 0) return res.status(400).json({ message: "No selected staff members available for assignment." });

    let startIndex = 0;
    const staffUsernames = staffs.map(staff => staff.username);
    const lastAssignedLead = await Chat.findOne({ assignedto: { $in: staffUsernames } }).sort({ datecreated: -1 });
    if (lastAssignedLead) {
      startIndex = (staffs.findIndex(s => s.username === lastAssignedLead.assignedto) + 1) % staffs.length;
    }

    for (let i = 0; i < unassignedLeads.length; i++) {
      const staff = staffs[(startIndex + i) % staffs.length];
      await Chat.findByIdAndUpdate(unassignedLeads[i]._id, { assignedto: staff.username });
    }

    res.json({ success: true, message: `Distributed ${unassignedLeads.length} leads across ${staffs.length} staff.` });
  } catch (err) {
    res.status(500).json({ message: "Distribution failed." });
  }
});


app.post("/leads/auto-assign/:id", auth, async (req, res) => {
  try {
    const lead = await Chat.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    // Check if toggle is actually ON
    const collection = mongoose.connection.db.collection('configs');
    const config = await collection.findOne({ key: 'auto_assign_enabled' });
    const autoAssignEnabled = config ? !!config.value : true;

    if (!autoAssignEnabled) {
       return res.json({ success: false, message: "Auto-Assign toggle is OFF", lead });
    }

    if (lead.assignedto && lead.assignedto.trim() !== "") {
       return res.json({ success: true, message: "Already assigned", lead });
    }

    const assignee = await Chat.getNextAssignee();
    if (assignee) {
      lead.assignedto = assignee;
      await lead.save();
      return res.json({ success: true, message: "Lead auto-assigned", lead });
    }
    
    res.json({ success: false, message: "No staff available for assignment", lead });
  } catch (err) {
    res.status(500).json({ success: false, message: "Assignment failed" });
  }
});


app.post("/leads/backend/:id", async (req, res) => {
  try {
    const lead = await Chat.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    // Check if toggle is actually ON
    const collection = mongoose.connection.db.collection('configs');
    const config = await collection.findOne({ key: 'auto_assign_enabled' });
    const autoAssignEnabled = config ? !!config.value : true;

    if (!autoAssignEnabled) {
       return res.json({ success: false, message: "Auto-Assign toggle is OFF", lead });
    }

    if (lead.assignedto && lead.assignedto.trim() !== "") {
       return res.json({ success: true, message: "Already assigned", lead });
    }

    const assignee = await Chat.getNextAssignee();
    if (assignee) {
      lead.assignedto = assignee;
      await lead.save();
      return res.json({ success: true, message: "Lead auto-assigned", lead });
    }
    
    res.json({ success: false, message: "No staff available for assignment", lead });
  } catch (err) {
    res.status(500).json({ success: false, message: "Assignment failed" });
  }
});

app.delete("/leads/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch lead first so we can cleanup any generated bills (S3 or local)
    const lead = await Chat.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    // Attempt to delete all associated installment bills (best-effort)
    try {
      const installments = lead.fees?.installments || [];
      for (const inst of installments) {
        if (inst && inst.billUrl) {
          try {
            await deleteBill(inst.billUrl);
            console.log(`Deleted bill for installment #${inst.number} of lead ${id}`);
          } catch (err) {
            console.warn(`Failed to delete bill for installment #${inst.number}:`, err.message || err);
          }
        }
      }
    } catch (err) {
      console.warn('Error cleaning up bills for lead deletion:', err.message || err);
    }

    const deletedLead = await Chat.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: "Lead deleted successfully", data: deletedLead });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting lead",
    });
  }
});


app.post("/leads/send-message", async (req, res) => {
  try {
    const body = req.body;
    console.log("Incoming body:", body);

    const response = await fetch(
      `${process.env.WP_CHAT_SERVICE_URL}/leadmsg/crm`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();

    return res.status(response.status).json({
      success: true,
      data
    });

  } catch (error) {
    console.error("Send message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send message"
    });
  }
});


app.put("/leads/:id/fees", async (req, res) => {
  try {
    const { id } = req.params;
    const { billedAmount, installments } = req.body;

    // Fetch existing lead to detect removed installments (so we can delete associated bills)
    const leadBefore = await Chat.findById(id);

    const oldInstallments = leadBefore?.fees?.installments || [];
    const processedInstallments = (installments || []).map(inst => {
      const processed = { ...inst, dueDate: new Date(inst.dueDate) };
      if (inst.status === 'Paid') {
        const existing = oldInstallments.find(o => o.number === inst.number);
        processed.paidAt = existing?.paidAt || new Date();
      } else {
        processed.paidAt = null;
      }
      return processed;
    });

    // Determine removed installments by `number` field and attempt to delete their stored bills
    try {
      const oldNums = (leadBefore?.fees?.installments || []).map(i => i.number).filter(Boolean);
      const newNums = processedInstallments.map(i => i.number).filter(Boolean);
      const removedNums = oldNums.filter(n => !newNums.includes(n));

      for (const num of removedNums) {
        const inst = (leadBefore?.fees?.installments || []).find(i => i.number === num);
        if (inst && inst.billUrl) {
          try {
            await deleteBill(inst.billUrl);
            console.log(`Deleted bill for removed installment #${num} of lead ${id}`);
          } catch (err) {
            console.warn(`Failed deleting bill for installment #${num}:`, err.message || err);
          }
        }
      }
    } catch (err) {
      console.warn('Error while attempting to clean up removed installment bills:', err.message || err);
    }

    const updateFields = {
      "fees.billedAmount": billedAmount,
      "fees.installments": processedInstallments,
      "fees.updatedAt": new Date()
    };

    // Only stamp billedAt the first time a billedAmount is established
    const previousBilled = leadBefore?.fees?.billedAmount || 0;
    if (billedAmount > 0 && !(previousBilled > 0)) {
      updateFields["fees.billedAt"] = new Date();
    }

    const updatedLead = await Chat.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );

    res.json({ success: true, lead: updatedLead });
  } catch (error) {
    console.error("Error updating fees:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update fees",
    });
  }
});


// ============================================
// 📄 Bill Generation & Sending Endpoint
// ============================================
app.post("/leads/:id/generate-bill", async (req, res) => {
  try {
    const { id } = req.params;
    const { installmentIndex, sendEmail } = req.body;

    // Validate input
    if (installmentIndex === undefined || installmentIndex === null) {
      return res.status(400).json({
        success: false,
        message: "installmentIndex is required (0-based index)"
      });
    }

    // Fetch the lead
    const lead = await Chat.findById(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    // Generate and send bill
    const result = await generateAndSendBill(lead, installmentIndex, sendEmail !== false);

    // Update the lead with bill generation status if successful
    if (result.success) {
      await Chat.findByIdAndUpdate(
        id,
        {
          $set: {
            "fees.installments.$[elem].billGenerated": true,
            "fees.installments.$[elem].billGeneratedAt": new Date(),
            "fees.installments.$[elem].billUrl": result?.details?.billUrl || result?.details?.billFile || null
          }
        },
        {
          arrayFilters: [{ "elem.number": installmentIndex + 1 }],
          new: true
        }
      ).catch(err => console.log("Note: Could not update bill status in DB:", err.message));
    }

    const totalBilledAmount = lead.fees?.billedAmount || 0;
    const amountPaidFirstInstallment = lead.fees?.installments?.[0]?.amount || 0;
    const totalPaid = (lead.fees?.installments || []).reduce((sum, i) => sum + (i.status === "Paid" ? (i.amount || 0) : 0), 0);
    const balance = totalBilledAmount - totalPaid;

    // Return response with bill generation status and requested totals
    res.json({
      success: result.success,
      message: result.message,
      billGenerated: result.billGenerated,
      emailSent: result.emailSent,
      details: result.details || null,
      installmentNumber: installmentIndex + 1,
      totalBilledAmount,
      amountPaidFirstInstallment,
      totalPaid,
      balance
    });
  } catch (error) {
    console.error("Error generating bill:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate bill",
      error: error.message
    });
  }
});


// ============================================
// 📋 Get Bill Status Endpoint (Check if bill was generated)
// ============================================
app.get("/leads/:id/bill-status", async (req, res) => {
  try {
    const { id } = req.params;
    const { installmentIndex } = req.query;

    if (installmentIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: "installmentIndex query parameter is required"
      });
    }

    const lead = await Chat.findById(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    const installment = lead.fees?.installments?.[parseInt(installmentIndex)];
    if (!installment) {
      return res.status(404).json({
        success: false,
        message: `Installment #${parseInt(installmentIndex) + 1} not found`
      });
    }

    const totalBilledAmount = lead.fees?.billedAmount || 0;
    const amountPaidFirstInstallment = lead.fees?.installments?.[0]?.amount || 0;
    const totalPaid = (lead.fees?.installments || []).reduce((sum, i) => sum + (i.status === "Paid" ? (i.amount || 0) : 0), 0);
    const balance = totalBilledAmount - totalPaid;

    res.json({
      success: true,
      installmentNumber: parseInt(installmentIndex) + 1,
      billGenerated: installment.billGenerated || false,
      billGeneratedAt: installment.billGeneratedAt || null,
      status: installment.status,
      amount: installment.amount,
      dueDate: installment.dueDate,
      totalBilledAmount,
      amountPaidFirstInstallment,
      totalPaid,
      balance
    });
  } catch (error) {
    console.error("Error fetching bill status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bill status",
      error: error.message
    });
  }
});


async function NotifyCounsellor(body) {
  const response = await fetch(
    `${process.env.WP_CHAT_SERVICE_URL}/leadmsg/crm`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );

  return response.json();
}


async function LeadAddNotification(number) {
  try {
    console.log("Add Lead Notified",number);

    const response = await fetch(
      `${process.env.WP_CHAT_SERVICE_URL}/notify/addlead`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullNumber: number
        })
      }
    );

    const text = await response.text();
    if (!response.ok) {
      console.error("LeadAddNotification failed response:", {
        status: response.status,
        bodyPreview: text.slice(0, 200)
      });
      return {
        success: false,
        status: response.status,
        message: "LeadAddNotification request failed"
      };
    }

    return {
      success: true,
      status: response.status,
      message: text || "Notification sent"
    };
  } catch (error) {
    console.error("LeadAddNotification error:", error.message);
    return {
      success: false,
      message: "LeadAddNotification failed"
    };
  }
}

module.exports = { NotifyCounsellor };




// --- AI Analysis Endpoint & Logic (Add this to your server file) ---

// Required imports:
// const OpenAI = require('openai');

// Initialize OpenAI
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });


// app.post('/leads/analyze/:id', async (req, res) => {
//     try {
//         const leadId = req.params.id;
//         const lead = await ChatModel.findById(leadId); // Assuming your model is named ChatModel

//         if (!lead) {
//             return res.status(404).json({ success: false, message: "Lead not found" });
//         }

//         // Prepare data for analysis
//         const remarksText = lead.remarks.map(r => `[${r.timestamp}] ${r.remark}`).join("\n");
//         const conversationsText = lead.conversations.map(c => `User: ${c.userMsg}\nBot: ${c.botReply}`).join("\n---\n");
        
//         const prompt = `
//         Analyze the following lead based on their remarks and conversation history.
        
//         Lead Details:
//         - Name: ${lead.userName}
//         - Course of Interest: ${lead.courseofintrest}
//         - Current Status: ${lead.status}
//         - Pipeline Stage: ${lead.pipeline}

//         Remarks History:
//         ${remarksText || "No remarks available."}

//         Conversation History:
//         ${conversationsText || "No conversation history available."}

//         Please provide a JSON response with the following fields and all fields are mandatory if you cannot fill any field say need more details:
//         1. "summary": A brief summary of the lead's engagement and interest.
//         2. "intentScore": A score from 0-100 indicating their likelihood to convert.
//         3. "buyingSignals": A list of positive buying signals observed.
//         4. "objections": A list of potential objections or concerns raised.
//         5. "recommendedAction": Specific next steps to move this lead forward.
//         6. "suggestedMessage": A personalized follow-up message draft.

//         Format the output purely as valid JSON.
//         `;

//         const completion = await openai.chat.completions.create({
//             messages: [{ role: "system", content: "You are an expert sales analyst assistant." }, { role: "user", content: prompt }],
//             model: "gpt-3.5-turbo",
//             response_format: { type: "json_object" },
//         });

//         const analysisResult = JSON.parse(completion.choices[0].message.content);

//         // Update lead with analysis
//         // lead.aiAnalysis = analysisResult;
//         // await lead.save();

//         res.json({ success: true, analysis: analysisResult });

//     } catch (error) {
//         console.error("Error analyzing lead:", error);
//         res.status(500).json({ success: false, message: "Failed to analyze lead", error: error.message });
//     }
// });


app.post("/leads/analyze/:id", async (req, res) => {
  try {
    const leadId = req.params.id;
    const lead = await Chat.findById(leadId);

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const remarksText = (lead.remarks || []).map(r => `[${r.timestamp}] ${r.remark}`).join("\n");
    const conversationsText = (lead.conversations || []).map(c => `User: ${c.userMsg}\nBot: ${c.botReply}`).join("\n---\n");

    const prompt = `
Analyze the lead "${lead.userName}" for "${lead.course || lead.courseofintrest}".
Current Status: ${lead.status} / ${lead.pipeline}
History: ${remarksText}
Conversations: ${conversationsText}

Generate exactly TWO distinct strategy solutions (Solution A and Solution B).
Mandatory rules:
1. If details for a field are missing, state "No details provided".
2. Solution A MUST be "Soft Re-Engagement Strategy".
3. Solution B MUST be "Career Push Strategy".

Fields for each solution:
1) probability: Admission Probability (e.g., 64%)
2) why: Brief explanation of the probability.
3) psychology: Behaviour & Psychology Insight.
4) marketTrend: Market Trend Injection.
5) roi: ROI & Placement Framing.
6) whatsapp: Suggested WhatsApp Message.
7) nextAction: Recommended Next Action.

Return ONLY valid JSON:
{
  "solutionA": { "title": "Soft Re-Engagement Strategy", "probability": "...", "why": "...", "psychology": "...", "marketTrend": "...", "roi": "...", "whatsapp": "...", "nextAction": "..." },
  "solutionB": { "title": "Career Push Strategy", "probability": "...", "why": "...", "psychology": "...", "marketTrend": "...", "roi": "...", "whatsapp": "...", "nextAction": "..." }
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a senior educational sales strategist." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const analysisResult = JSON.parse(completion.choices[0].message.content);
    lead.aiAnalysis = analysisResult;
    await lead.save();

    res.json({ success: true, analysis: analysisResult });
  } catch (error) {
    console.error("AI Analysis Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate strategies" });
  }
});

app.post("/leads/assistant/ask", async (req, res) => {
  try {
    const { lead, question, history = [] } = req.body;


    if (!lead || !question) {
      return res.status(400).json({
        success: false,
        message: "Lead and question are required"
      });
    }

    const remarksText = (lead.remarks || [])
      .map(r => `[${r.timestamp}] ${r.remark}`)
      .join("\n");

    const conversationsText = (lead.conversations || [])
      .map(c => `User: ${c.userMsg}\nBot: ${c.botReply}`)
      .join("\n---\n");

     const chatHistory = history.map(m => ({
  role: m.role,
  content: m.content
}));


const prompt = `
You are Minmini, an intelligent CRM Lead Assistant helping a sales executive manage and convert leads.

The person asking questions is an INTERNAL CRM USER (sales executive), NOT the lead.

--------------------------------------------------
STEP 1 — Understand the Question Type
--------------------------------------------------

First determine the intent of the user's question.

There are 3 types:

1️⃣ GREETING / SMALL TALK
Examples:
hi
hello
good morning
how are you

→ Respond like a friendly chatbot I'm minmini you're sales assistant and here to guide.
→ DO NOT talk about the lead.


2️⃣ GENERAL QUESTION
Examples:
job opportunities for python
what is full stack
course duration
salary for python developer
career scope

→ Answer normally like a chatbot.
→ DO NOT talk about the lead unless explicitly asked.


3️⃣ LEAD RELATED QUESTION
Examples:
summarize this lead
is this lead interested
what should be the next follow up
generate whatsapp message for this lead
what is the status of the lead

→ Use the lead profile and analyze.


--------------------------------------------------
STEP 2 — Response Rules
--------------------------------------------------

If GREETING:
Reply friendly in 1–2 lines.

If GENERAL QUESTION:
Answer normally in 3–4 lines.

If LEAD QUESTION:
Analyze the lead and provide insights.

Possible actions:
• Lead summary
• Conversion potential
• Next step suggestion

If follow-up seems needed ask:

"Would you like me to generate a suggested WhatsApp follow-up message? or How can to convert the lead"

If user says YES:
Generate ONLY 2 line WhatsApp message.

Never restart the conversation if the user replies with short confirmations like yes, ok, sure, thanks.
Always interpret them based on previous assistant message.


--------------------------------------------------
USER QUESTION
--------------------------------------------------
${question}


--------------------------------------------------
LEAD PROFILE (USE ONLY IF QUESTION IS LEAD RELATED)
--------------------------------------------------
Name: ${lead.userName}
Phone: ${lead.userNumber}
Course Interest: ${lead.course || lead.courseofintrest || "N/A"}
Status: ${lead.status}
Pipeline: ${lead.pipeline}
Source: ${lead.leadfrom || "N/A"}
Program Type: ${lead.programType || "N/A"}


--------------------------------------------------
REMARKS
--------------------------------------------------
${remarksText || "No remarks available."}


--------------------------------------------------
CONVERSATION HISTORY
--------------------------------------------------
${conversationsText || "No conversation history available."}
`;


    console.log(history)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an minmini sales assistant." },
         ...chatHistory,
        { role: "user", content: prompt }
      ],
    });

    const reply = completion.choices[0].message.content;

    res.json({
      success: true,
      reply
    });
  } catch (error) {
    console.error("Lead assistant error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get assistant response",
      error: error.message
    });
  }
});


// Converts 1st letter to string
// function toTitleCase(str) {
//   if (!str || typeof str !== "string") return str;
//   return str
//     .trim()
//     .toLowerCase()
//     .replace(/\b\w/g, (char) => char.toUpperCase());
// }

// Converts all to uppercase 
function toTitleCase(str) {
  if (!str || typeof str !== "string") return str;
  return str.trim().toUpperCase();
}

app.post("/intern/certificate", async (req, res) => {
  console.log(req.body)
  try {
    const {
      salutation,
      userName,
      userEmail,
      phone,
      reg_no,
      year_of_study,
      college,
      college_location,
      degree,
      other_degree,
      department,
      internship,
      other_internship,
      workshop,
      other_workshop,
      start_date,
      end_date,
      issue_date,
      company,
      batch_code,
      career_advisor,
      is_leader
    } = req.body;

    if (!userName || !phone) {
      return res.status(400).json({
        success: false,
        message: "userName and phone are required."
      });
    }

    const sanitizedNumber = String(phone).replace(/\D/g, "");


    const fullNumber = cleanIndianMobileNumber(sanitizedNumber)
    const parsedIsLeader =
      typeof is_leader === "boolean"
        ? is_leader
        : typeof is_leader === "string"
          ? is_leader.trim().toLowerCase() === "true"
          : false;

    const internDetails = {
      salutation: salutation?.trim() || "",
      userName: toTitleCase(userName) || "",
      userEmail: userEmail?.trim().toLowerCase() || "",
      phone: sanitizedNumber,
      reg_no: reg_no?.trim() || "",
      year_of_study: year_of_study?.trim() || "",
      college: toTitleCase(college) || "",
      college_location: toTitleCase(college_location)|| "",
      degree: toTitleCase(degree) || "",
      other_degree: other_degree?.trim() || "",
      department: toTitleCase(department) || "",
      internship: toTitleCase(internship)|| "",
      other_internship: other_internship?.trim() || "",
      workshop: toTitleCase(workshop) || "",
      other_workshop: other_workshop?.trim() || "",
      start_date: start_date || null,
      end_date: end_date || null,
      issue_date: issue_date || null,
      company: company?.trim() || "",
      batch_code: batch_code?.trim() || ""
    };

    let chat = await Chat.findOne({ userNumber: fullNumber });

    if (chat) {
      chat.userName = chat.userName || internDetails.userName;
      chat.is_leader = parsedIsLeader;
      if (!Array.isArray(chat.InternDetails)) {
        chat.InternDetails = [];
      }
      // chat.InternDetails.push(internDetails);
      chat.InternDetails = [internDetails];
      await chat.save();
    } else {
      console.log(career_advisor)
      chat = await Chat.create({
        userName: internDetails.userName,
        userNumber: fullNumber,
        status: "Cold",
        pipeline: "Enrolled",
        leadfrom: "Website",
        course : "College Internship",
        assignedto : career_advisor?.trim() || "",
        is_leader: parsedIsLeader,
        lastInteracted: new Date(),
        datecreated: new Date(),
        InternDetails: [internDetails]
      });
    }

    return res.status(201).json({
      success: true,
      message: "Intern certificate details saved successfully.",
      chat
    });
  } catch (error) {
    console.error("Error saving intern certificate details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save intern certificate details.",
      error: error.message
    });
  }
});

app.post("/intern/certificate/generate", async (req, res) => {
  try {
    const { userNumber } = req.body;

    if (!userNumber) {
      return res.status(400).json({
        success: false,
        message: "userNumber is required."
      });
    }

    const fullNumber = cleanIndianMobileNumber(userNumber);
    if (!fullNumber || fullNumber.length !== 12) {
      return res.status(400).json({
        success: false,
        message: "Please send a valid Indian mobile number."
      });
    }

    const chat = await Chat.findOne({ userNumber: fullNumber }).lean();

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "No user found for this userNumber."
      });
    }

    const latestInternDetails = Array.isArray(chat.InternDetails) && chat.InternDetails.length
      ? chat.InternDetails[chat.InternDetails.length - 1]
      : null;

    if (!latestInternDetails) {
      return res.status(404).json({
        success: false,
        message: "No intern certificate details found for this user."
      });
    }

    // Delete old S3 certificates for this user before regenerating
    if (Array.isArray(chat.certificates) && chat.certificates.length) {
      await Promise.all(
        chat.certificates
          .filter(c => c && c.fileName)
          .map(c => deleteFromS3(c.fileName))
      );
    }

    const certificates = await generateCertificates({
      ...latestInternDetails,
      userNumber: chat.userNumber,
      userName: latestInternDetails.userName || chat.userName
    });

    const certificatesSaved = (certificates || []).map(cert => ({
      success: !!cert.success,
      fileName: cert.fileName || null,
      message: cert.message || null,
      s3: cert.s3 || null
    }));

    // Persist the generated certificates on the Chat document (best-effort)
    try {
      await Chat.findByIdAndUpdate(chat._id, { $set: { certificates: certificatesSaved } });
    } catch (err) {
      console.warn("Warning: could not save certificates to DB:", err && err.message ? err.message : err);
    }

    return res.status(200).json({
      success: true,
      message: "Certificates generated successfully.",
      userNumber: chat.userNumber,
      internDetails: latestInternDetails,
      certificates: certificatesSaved
    });
  } catch (error) {
    console.error("Error generating intern certificates:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate certificates.",
      error: error.message
    });
  }
});

// Combine all intern certificates into one PDF and return an S3 link for printing
app.post("/intern/certificates/print-all", async (req, res) => {
  try {
    const { userNumber } = req.body;

    if (!userNumber) {
      return res.status(400).json({ success: false, message: "userNumber is required." });
    }

    const fullNumber = cleanIndianMobileNumber(userNumber);
    if (!fullNumber || fullNumber.length !== 12) {
      return res.status(400).json({ success: false, message: "Please send a valid Indian mobile number." });
    }

    const chat = await Chat.findOne({ userNumber: fullNumber }).lean();
    if (!chat) {
      return res.status(404).json({ success: false, message: "No user found for this userNumber." });
    }

    const latestInternDetails = Array.isArray(chat.InternDetails) && chat.InternDetails.length
      ? chat.InternDetails[chat.InternDetails.length - 1]
      : null;

    if (!latestInternDetails) {
      return res.status(404).json({ success: false, message: "No intern certificate details found for this user." });
    }

    const result = await generateCombinedCertificate({
      ...latestInternDetails,
      userNumber: chat.userNumber,
      userName: latestInternDetails.userName || chat.userName
    });

    if (!result.url) {
      return res.status(500).json({ success: false, message: result.message || "Failed to upload combined certificate to S3." });
    }

    return res.status(200).json({
      success: true,
      message: "Combined certificate generated successfully.",
      url: result.url,
      fileName: result.fileName
    });
  } catch (error) {
    console.error("Error generating combined certificate:", error);
    return res.status(500).json({ success: false, message: "Failed to generate combined certificate.", error: error.message });
  }
});

// Generate a unique batch_code for an intern entry on a Chat document
app.post('/intern/:id/generate-batch', async (req, res) => {
  try {
    const { id } = req.params;
    const { internIndex } = req.body;

    if (!id) return res.status(400).json({ success: false, message: 'Chat id required in URL' });

    const chat = await Chat.findById(id);
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    if (!Array.isArray(chat.InternDetails) || chat.InternDetails.length === 0) {
      return res.status(404).json({ success: false, message: 'No intern details found for this chat' });
    }

    const idx = (internIndex !== undefined && internIndex !== null)
      ? parseInt(internIndex, 10)
      : (chat.InternDetails.length - 1);

    if (isNaN(idx) || idx < 0 || idx >= chat.InternDetails.length) {
      return res.status(400).json({ success: false, message: 'Invalid internIndex' });
    }

    const intern = chat.InternDetails[idx] || {};
    const collegeRaw = (intern.college || '').toString().trim();
    const collegeCode = (collegeRaw.replace(/[^A-Za-z]/g, '').slice(0, 3) || 'OTH').toUpperCase();

    const dateSrc = intern.start_date ? new Date(intern.start_date) : new Date();
    const mm = String(dateSrc.getMonth() + 1).padStart(2, '0');
    const yy = String(dateSrc.getFullYear()).slice(-2);

    // Short time suffix for uniqueness (HHMM)
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const timeSuffix = `${hh}${min}`;

    const proposed = `BATCH-${collegeCode}-${mm}${yy}-${timeSuffix}`;

    const existing = await Chat.findOne({ 'InternDetails.batch_code': proposed });
    const finalCode = existing
      ? existing.InternDetails.find(i => i.batch_code === proposed).batch_code
      : proposed;

    chat.InternDetails[idx].batch_code = finalCode;
    chat.is_leader = true 
    await chat.save();

    // ✅ Fixed: was using undefined `candidate`, now using `finalCode`
    return res.json({ success: true, batch_code: finalCode, internIndex: idx, chatId: chat._id });
  } catch (err) {
    console.error('Error generating batch code:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate batch code', error: err.message });
  }
});


// async function migrateChats() {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     // 1. Fetch chats assigned to Abhi
//     const chats = await Chat.find({ assignedto: "Abhi" }).session(session);

//     if (!chats.length) {
//       console.log("No chats found for Abhi");
//       await session.abortTransaction();
//       session.endSession();
//       return;
//     }

//     console.log(`Found ${chats.length} chats assigned to Abhi`);

//     // 2. Backup to temp collection
//     const backupData = chats.map(chat => {
//       const obj = chat.toObject();
//       obj.originalId = obj._id; // optional tracking
//       obj.backupAt = new Date();
//       return obj;
//     });

//     await TempChat.insertMany(backupData, { session });

//     console.log("Backup completed");

//     // 3. Update assignedto → Shindu
//     const updateResult = await Chat.updateMany(
//       { assignedto: "Abhi" },
//       { $set: { assignedto: "Shindu" } },
//       { session }
//     );

//     console.log(`Updated ${updateResult.modifiedCount} chats`);

//     // 4. Commit transaction
//     await session.commitTransaction();
//     session.endSession();

//     console.log("Migration completed successfully");
//   } catch (error) {
//     console.error("Migration failed:", error);

//     await session.abortTransaction();
//     session.endSession();
//   }
// }


// migrateChats()


// ============================================
// 🧑‍🏫 Trainer Endpoints
// ============================================

// GET /trainers — all trainers with their name and existing batchIds
app.get("/trainers", async (req, res) => {
  try {
    const trainers = await TrainerModel.find({}, { username: 1, batchIds: 1, _id: 1 }).lean();
    return res.json({ success: true, trainers });
  } catch (err) {
    console.error("GET /trainers error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch trainers" });
  }
});

// POST /chat/assign-batch — save Trainer, batchId, batch_time to a chat
// Body: { _id, Trainer, batch_time, batchId? }
// If batchId is omitted, a new one is generated as TrainerName-DDMM-HHmmss
app.post("/chat/assign-batch", async (req, res) => {
  try {
    const { _id, Trainer, batch_date, batchId } = req.body;

    if (!_id) return res.status(400).json({ success: false, message: "_id is required" });
    if (!Trainer) return res.status(400).json({ success: false, message: "Trainer is required" });

    const chat = await Chat.findById(_id);
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });

    let assignedBatchId = batchId;

    if (!assignedBatchId) {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const hh = String(now.getHours()).padStart(2, "0");
      // const min = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");

      const trainerSlug = Trainer.trim().replace(/\s+/g, "");
      assignedBatchId = `${trainerSlug}-${dd}${mm}-${hh}${ss}`;

      // Push generated batchId into Trainer document if found
      await TrainerModel.findOneAndUpdate(
        { username: new RegExp(`^${Trainer.trim()}$`, "i") },
        { $addToSet: { batchIds: assignedBatchId } }
      );
    }

    chat.batchId = assignedBatchId;
    chat.Trainer = Trainer.trim();
    if (batch_date !== undefined) chat.batch_date = batch_date;
    await chat.save();

    return res.json({ success: true, batchId: assignedBatchId, Trainer: chat.Trainer, batch_time: chat.batch_time, chat });
  } catch (err) {
    console.error("POST /chat/assign-batch error:", err);
    return res.status(500).json({ success: false, message: "Failed to assign batch" });
  }
});


// Update date_scheduled for the latest InternDetails entry
app.put('/leads/:id/date-scheduled', async (req, res) => {
  try {
    const { id } = req.params;
    const { date_scheduled } = req.body;

    const chat = await Chat.findByIdAndUpdate(
      id,
      { $set: { date_scheduled: date_scheduled ? new Date(date_scheduled) : null } },
      { new: true, strict: false }
    );
    if (!chat) return res.status(404).json({ success: false, message: 'Lead not found' });

    // Propagate date_scheduled to all leads in the same batch
    const dateValue = date_scheduled ? new Date(date_scheduled) : null;
    const batchCode = chat.InternDetails?.[0]?.batch_code?.trim();

    if (chat.batchId) {
      await Chat.updateMany(
        { batchId: chat.batchId, _id: { $ne: chat._id } },
        { $set: { date_scheduled: dateValue } },
        { strict: false }
      );
    } else if (batchCode) {
      await Chat.updateMany(
        { "InternDetails.batch_code": batchCode, _id: { $ne: chat._id } },
        { $set: { date_scheduled: dateValue } },
        { strict: false }
      );
    }

    // fetch fresh so date_scheduled is always present in response
    const fresh = await Chat.findById(chat._id).lean();
    return res.json({ success: true, lead: fresh });
  } catch (err) {
    console.error('PUT /leads/:id/date-scheduled error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update date scheduled' });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
