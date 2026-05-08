### 1.Plan Default
 - Enter plan mode for non trivial task(3+steps or architectural decisions)
 - If something goes sideways,STOP and replan imediatly  - don`t keep pushing
 - Use plan mode for verification steps, not just building
 - Write detailed specs upfront to reduce ambiguity

 ### 2.Subagent strategy
 - Use subagents liberally to keep main content window clean
 - Offload research, exploration,and parallel analisys to subagents
 - For complex problems, throw more compute at it via subagents
 - One task per subagent for focused execution

 ### 3.Self imoprovement loop
 - Write rools for yourself to avoid the same mistake
 - Ruthlesly iterate on those lessons until mistake rate drops
 - review lessons at session start for relevant project

 ### 4.Verification before done
 - Never mark a task, job complete without proving it works
 - Diff behaviour between main and tour changes when relevant
 - ask yoursef: "Would a staff engineer approve this?"
 - Run test, check logs, demonstrate corectness

### 5.Demand elegance (Balance)
 - For non-trivial changes: pause and ask:"Is there a more elegant way?"
 - If a fix felles hacky or AI-ish "Knowing everything I know now, implement the elegand solution"
 - Skip this for simple, chivous fixes - dont over-engineer
 -Challenge your own work before presenting it or the solution

### 6.Autonomous Bug Fixing
 - When given a bug report: just fix it. Dont ask for hand holding
 - Point at logs, error,failing test - then resolve them
 - zero context switching required from user
 - Gi fix failing CI tests without being told how

 ## Task managemen ##

 1. **Plan First**: Write plan to `tasks/todo.md`with checkable items
 2. **Verify Plan** Check in before starting implmentation
 3. **Track Progress** Mark items complete as you go
 4. **Explain changes** High level summary at eacg step
 5. **Document result** Add review section to `tasks/todo.md``
 6. **Capture Lessons** Update `tasks/lessons.md`after corrections

 ##Core Principles

 1. **Simplicity First** Make every change as simpole as possible. Impact minimal code.
 2. **No laziness** Find root causes. No temporary fixes.Senior developer standards.
 3. **Minimal impact** Changes should only touch whast is necesary. Avoind introducing bugs, over complicated fixes, dont do to much commenting and use simple,readable code with easy naming. 