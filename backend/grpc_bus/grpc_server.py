"""
gRPC Task Bus for MeetMaxxing worker agents (Google A2A Protocol stub).
Handles async task dispatch over gRPC.
"""
import json
import logging
from concurrent import futures
import grpc
from . import grpc_bus_pb2
from . import grpc_bus_pb2_grpc

from ..agents.memory_agent import run_memory_agent
from ..agents.scheduler_agent import run_scheduler_agent
from ..agents.summary_agent import run_summary_agent
from ..agents.realtime_agent import run_realtime_agent
from ..agents.email_agent import run_email_agent
from ..agents.slack_agent import run_slack_agent
from ..agents.late_join_agent import run_late_join_agent
from ..agents.transcription_agent import process_transcript_chunk

logger = logging.getLogger(__name__)

class AgentTaskBusServicer(grpc_bus_pb2_grpc.AgentTaskBusServicer):
    def DispatchTask(self, request, context):
        logger.info(f"[gRPC Task Bus] Received task for {request.agent_name} - Meeting {request.meeting_id}")
        
        try:
            payload = json.loads(request.payload_json)
        except json.JSONDecodeError:
            return grpc_bus_pb2.TaskResponse(
                success=False,
                error_message="Invalid JSON payload"
            )

        result = {}
        success = True
        error_msg = ""
        
        try:
            # Sync wrapper for async agents (in a real setup, we'd use grpc.aio)
            import asyncio
            
            async def run_agent():
                if request.agent_name == "memory":
                    return await run_memory_agent(
                        question=payload.get("question", ""),
                        org_id=payload.get("org_id", ""),
                        user_id=payload.get("user_id", "")
                    )
                elif request.agent_name == "scheduler":
                    return await run_scheduler_agent(
                        summary_output=payload.get("summary", {}),
                        attendee_emails=payload.get("attendees", []),
                        calendar_token=payload.get("token", {}),
                        org_id=payload.get("org_id", "")
                    )
                elif request.agent_name == "summary":
                    return await run_summary_agent(
                        meeting_id=request.meeting_id,
                        title=payload.get("title", ""),
                        attendees=payload.get("attendees", []),
                        utterances=payload.get("utterances", None)
                    )
                elif request.agent_name == "realtime":
                    return await run_realtime_agent(
                        meeting_id=request.meeting_id,
                        context=payload.get("context", {}),
                        force=payload.get("force", False)
                    )
                elif request.agent_name == "email":
                    return await run_email_agent(
                        meeting_id=request.meeting_id,
                        summary_output=payload.get("summary", {})
                    )
                elif request.agent_name == "slack":
                    return await run_slack_agent(
                        meeting_id=request.meeting_id,
                        summary_output=payload.get("summary", {})
                    )
                elif request.agent_name == "late_join":
                    return await run_late_join_agent(
                        meeting_id=request.meeting_id
                    )
                elif request.agent_name == "transcription":
                    return await process_transcript_chunk(
                        meeting_id=request.meeting_id,
                        raw_text=payload.get("raw_text", ""),
                        speaker=payload.get("speaker", ""),
                        timestamp_ms=payload.get("timestamp_ms", 0)
                    )
                else:
                    raise ValueError(f"Unknown agent: {request.agent_name}")

            # Run in new event loop for sync context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(run_agent())
            loop.close()
            
        except Exception as e:
            success = False
            error_msg = str(e)
            logger.error(f"[gRPC Task Bus] Agent execution failed: {e}")

        return grpc_bus_pb2.TaskResponse(
            success=success,
            result_json=json.dumps(result),
            error_message=error_msg
        )

def serve():
    try:
        server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
        grpc_bus_pb2_grpc.add_AgentTaskBusServicer_to_server(AgentTaskBusServicer(), server)
        port = server.add_insecure_port('[::]:50051')
        if port == 0:
            logger.warning("[gRPC Task Bus] Port 50051 already bound or unavailable. Skipping gRPC server startup.")
            return
        logger.info("Starting gRPC Task Bus on port 50051...")
        server.start()
        server.wait_for_termination()
    except Exception as e:
        logger.warning(f"[gRPC Task Bus] Could not start gRPC server: {e}")

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    serve()
