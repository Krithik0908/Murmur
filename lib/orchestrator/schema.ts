
import mongoose, { Schema, Document, Model } from "mongoose";
import { AgentId } from "@/lib/types";
import { AgentStatus } from "@/lib/orchestrator/types";

// ─────────────────────────────────────────────────────────────────────────────
// Physical Mongoose Schemas (Used when MongoDB Atlas is connected)
// ─────────────────────────────────────────────────────────────────────────────
export interface IAgentRun extends Document {
  runId: string;
  agentId: string;
  status: string;
  decision: string;
  reasoning: string;
  summary: string;
  dependsOn: string[];
  lastUpdated: Date;
}

export interface ICorrection extends Document {
  runId: string;
  agentId: string;
  oldDecision: string;
  correctionText: string;
  timestamp: Date;
  downstreamAffected: string[];
}

const AgentRunSchema = new Schema<IAgentRun>({
  runId:       { type: String, required: true },
  agentId:     { type: String, required: true },
  status:      { type: String, required: true },
  decision:    { type: String, default: "" },
  reasoning:   { type: String, default: "" },
  summary:     { type: String, default: "" },
  dependsOn:   { type: [String], default: [] },
  lastUpdated: { type: Date, default: Date.now },
});

AgentRunSchema.index({ runId: 1, agentId: 1 }, { unique: true });

const RealAgentRunModel: Model<IAgentRun> =
  mongoose.models.AgentRun ?? mongoose.model<IAgentRun>("AgentRun", AgentRunSchema);

const CorrectionSchema = new Schema<ICorrection>({
  runId:              { type: String, required: true },
  agentId:            { type: String, required: true },
  oldDecision:        { type: String, default: "" },
  correctionText:     { type: String, required: true },
  timestamp:          { type: Date, default: Date.now },
  downstreamAffected: { type: [String], default: [] },
});

const RealCorrectionModel: Model<ICorrection> =
  mongoose.models.Correction ?? mongoose.model<ICorrection>("Correction", CorrectionSchema);

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Database Store (Used when MongoDB Atlas is firewalled / offline)
// ─────────────────────────────────────────────────────────────────────────────
interface AgentRunDoc {
  runId: string;
  agentId: AgentId;
  status: AgentStatus;
  decision: string;
  reasoning: string;
  summary: string;
  dependsOn: AgentId[];
  lastUpdated: Date;
}

interface CorrectionDoc {
  runId: string;
  agentId: AgentId;
  oldDecision: string;
  correctionText: string;
  timestamp: Date;
  downstreamAffected: AgentId[];
}

declare global {
  // eslint-disable-next-line no-var
  var _murmurMemDb: {
    agentRuns: AgentRunDoc[];
    corrections: CorrectionDoc[];
  };
}

if (!global._murmurMemDb) {
  global._murmurMemDb = {
    agentRuns: [],
    corrections: [],
  };
}

const memDb = global._murmurMemDb;

function matchesQuery(doc: any, query: any): boolean {
  for (const key in query) {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      const val = query[key];
      if (val && typeof val === "object" && "$in" in val) {
        if (!val.$in.includes(doc[key])) return false;
      } else {
        if (doc[key] !== val) return false;
      }
    }
  }
  return true;
}

function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// Helper to create a chainable, thenable query mock for in-memory operations
function makeInMemoryQueryChain<T>(results: T[]) {
  const promise = Promise.resolve(results);
  return Object.assign(promise, {
    sort(sortObj: any) {
      const sorted = [...results].sort((a: any, b: any) => {
        const key = Object.keys(sortObj)[0];
        const order = sortObj[key];
        if (a[key] < b[key]) return -1 * order;
        if (a[key] > b[key]) return 1 * order;
        return 0;
      });
      return makeInMemoryQueryChain(sorted);
    },
    lean() {
      return Promise.resolve(results);
    },
  });
}

function makeInMemorySingleQueryChain<T>(result: T | null) {
  const promise = Promise.resolve(result);
  return Object.assign(promise, {
    lean() {
      return Promise.resolve(result);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hybrid Export Model: Direct to MongoDB or fallback to In-Memory
// ─────────────────────────────────────────────────────────────────────────────
export const AgentRun = {
  async insertMany(docs: Omit<AgentRunDoc, "lastUpdated">[]) {
    if (isMongoConnected()) {
      return RealAgentRunModel.insertMany(docs);
    }
    const formatted = docs.map((doc) => ({
      ...doc,
      lastUpdated: new Date(),
    }));
    memDb.agentRuns.push(...formatted);
    return formatted;
  },

  findOne(query: any) {
    if (isMongoConnected()) {
      return RealAgentRunModel.findOne(query);
    }
    const doc = memDb.agentRuns.find((r) => matchesQuery(r, query)) ?? null;
    return makeInMemorySingleQueryChain(doc);
  },

  find(query: any) {
    if (isMongoConnected()) {
      return RealAgentRunModel.find(query);
    }
    const matched = memDb.agentRuns.filter((r) => matchesQuery(r, query));
    return makeInMemoryQueryChain(matched);
  },

  async findOneAndUpdate(query: any, update: any) {
    if (isMongoConnected()) {
      return RealAgentRunModel.findOneAndUpdate(query, update, { new: true });
    }
    const doc = memDb.agentRuns.find((r) => matchesQuery(r, query));
    if (!doc) return null;

    Object.assign(doc, {
      ...update,
      lastUpdated: new Date(),
    });
    return doc;
  },

  async updateMany(query: any, update: any) {
    if (isMongoConnected()) {
      return RealAgentRunModel.updateMany(query, update);
    }
    const matched = memDb.agentRuns.filter((r) => matchesQuery(r, query));
    for (const doc of matched) {
      Object.assign(doc, {
        ...update,
        lastUpdated: new Date(),
      });
    }
    return { modifiedCount: matched.length };
  },
};

export const Correction = {
  async create(doc: Omit<CorrectionDoc, "timestamp">) {
    if (isMongoConnected()) {
      return RealCorrectionModel.create(doc);
    }
    const formatted = {
      ...doc,
      timestamp: new Date(),
    };
    memDb.corrections.push(formatted);
    return formatted;
  },

  find(query: any) {
    if (isMongoConnected()) {
      return RealCorrectionModel.find(query);
    }
    const matched = memDb.corrections.filter((c) => matchesQuery(c, query));
    return makeInMemoryQueryChain(matched);
  },
};
