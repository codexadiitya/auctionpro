#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Build a clone of https://www.superplayerauction.com (Super Player Auction) — a sports player-auction platform. Rebrand as 'AuctionPro' with modern sporty UI, add demo/contact functionality and Stripe payment integration."

backend:
  - task: "GET /api/packages - fetch pricing packages"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Returns 4 pricing tiers (starter free, pro 3000, premium 4000, elite 5000) as server-side truth. Frontend never sends amounts."

  - task: "POST /api/contact - submit contact message"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Stores contact messages in MongoDB (contact_messages collection). Returns {success, id}."

  - task: "POST /api/demo - submit demo request"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Stores demo requests in MongoDB (demo_requests collection)."

  - task: "POST /api/payments/checkout - Stripe checkout"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Uses emergentintegrations StripeCheckout with sk_test_emergent. Accepts {package_id, origin_url}. Amount looked up from server-side PACKAGES map (INR currency). Inserts payment_transactions row with status=initiated/pending BEFORE returning checkout_url. Returns 400 for invalid package or free plan."

  - task: "GET /api/payments/status/{session_id}"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Polls Stripe on pending records and flips DB idempotently. Returns 404 for unknown session_id."

  - task: "POST /api/webhook/stripe"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Uses StripeCheckout.handle_webhook, idempotent update guarded by payment_status != 'paid'."

frontend:
  - task: "Landing page rendering (Hero, Auctions, About, MobileApp, Features, Pricing, Clients, Contact, Footer)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/Landing.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Modern sporty dark theme with orange/amber accents, Bebas Neue display font."

  - task: "Stripe checkout flow (Pricing -> Success/Cancel pages)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/Pricing.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Frontend sends {package_id, origin_url}; PaymentSuccess polls status every 2s up to 20 attempts."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus:
    - "GET /api/packages - fetch pricing packages"
    - "POST /api/payments/checkout - Stripe checkout"
    - "GET /api/payments/status/{session_id}"
    - "POST /api/contact - submit contact message"
    - "POST /api/demo - submit demo request"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Full-stack AuctionPro built in one go. Backend uses emergentintegrations Flow B (sandbox provisioning returned 500 repeatedly). Stripe key: sk_test_emergent (test mode). Currency: INR. Please verify all 6 backend endpoints work correctly, especially the Stripe checkout flow which must (a) reject invalid package_id, (b) reject free plan, (c) return checkout_url + session_id for valid paid packages, (d) insert payment_transactions row."
