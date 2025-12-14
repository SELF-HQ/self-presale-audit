PENTEST PROPOSAL CERTIK
SMART CONTRACT METHODOLOGY
At CertiK, we implement a transparent process and make our reviews a collaborative effort.
The goals of our security audits are to prove the soundness of protocol design, enhance the
source code quality, and output sufficient remediations to the system. CertiK team utilizes the
following methodologies in the security audit process.
Expert Manual Review
By leveraging experts in security-oriented code review, we greatly reduce the chance that
potential bugs and vulnerabilities go undetected. This diligent review offers customized
detections and suggestions about high-level system design and protocol logics. Our team also
identifies areas where more defensive programming could be applied to reduce the risk of
mistakes and loopholes. In addition to focusing on the source code in scope, we also examine
code dependencies when they are relevant to the investigated area.
Automated Static Analysis
CertiK security engineers and researchers have put tremendous efforts into developing
automated static analysis toolkits that increase the chances of detecting flaws and critical
risks, including risks not easily detected by human efforts. Our approaches range from Syntax
Analysis, Semantics Analysis, Vulnerability Base Analysis (60,000+ findings database), Rule
Base Analysis (1,000+ rules), and Formal Verification, which mathematically proves the
correctness of core components. We customize the threat models and attack scenarios for
each project, then apply analytical examinations and investigations accordingly.
Interactive Dynamic Analysis
CertiK's security engineers and researchers have dedicated substantial efforts to crafting
interactive dynamic analysis toolkits. These toolkits significantly enhance the likelihood of
identifying vulnerabilities and critical risks, even those that might elude human inspection and
static analysis methods. Our methodology encompasses a spectrum of techniques, including
conventional unit and integration testing, advanced property-based fuzz testing, and
interactive examination. Each project benefits from a tailored threat model and attack scenario,
ensuring that our analytical scrutiny is precise and effective in uncovering potential issues.
In-depth Documented Findings
The whole process of auditing is thorough, transparent, interactive, and accompanied with
milestone-driven preliminary comments/reports. Communication channels are opened between
the teams of engineers for fast collaboration, and upon client request, this communication may
be logged as well. All findings of the security analysis are fully documented with in-depth
reasoning and supporting materials like testing outputs or screenshots for demonstrative
purposes.
PROPRIETARY AND CONFIDENTIAL
PENTEST PROPOSAL CERTIK
SMART CONTRACT METHODOLOGY - continued
Expressive Correctness Specification
CertiK verification engineers and researchers will, based on the documentation and code,
create the formal specification of the artifacts to verify. The specification covers the security,
safety, and correctness properties of the code implementation w.r.t. the documented or
publicly stated invariants, assumptions, and guarantees. The specification can be written in
Separation Logic or in the Calculus of Inductive Constructions (a higher-order formal logic),
which gives expressive power that has been demonstrated to be adequate for handling
complex mathematical, financial, protocol, and systems code.
Trustworthy Machine-checked Verification
CertiK's verification engineers harness the power of our cutting-edge deductive formal
verification framework, Scivik, along with automation tools, to ensure the safety, correctness,
and security of code implementations in line with specifications. Our verification process is
entirely rigorous and machine-checked, effectively eradicating potential human errors in
proofs. Moreover, our CertiK team possesses an arsenal of broadly applicable specifications.
We not only apply these specifications as a foundation but also offer supplementary services
to tailor and refine specifications for each project. This ensures that our formal verification
aligns perfectly with the distinct threat models, attack scenarios, and desired properties of
each engagement.
Remediations and Recommendations
The primary objective is to offer the client with actionable items and upgrade suggestions from
our analysis and discovery. CertiK engineers, seasoned with general software engineering and
security experience, will try their best to outline or mitigate the vulnerabilities that may affect
the system as a whole. At the completion and delivery of the final report, all critical and
medium findings and recommendations should be resolved.
PROPRIETARY AND CONFIDENTIAL
PENTEST PROPOSAL CERTIK
REVIEW OBJECTIVES (Smart contract)
In order to analyze and detect potential vulnerabilities that could affect the project, CertiK
engineers will conduct technical due diligence to assess and verify the modules’ security
correctness of design and implementation. The following list of checkpoints is included as
reference:
Vulnerability Checkpoints
Arithmetic ● Integer underflow/overflow
● Floating Points and Precision
Access & Privilege
Control
● Administrative functionality for control and emergency handling
● Restriction access for sensitive functions and data
● Rate limit for critical operations, permission to contract state changes,
and delay operations for malicious/sensitive actions
Denial of Service ● Unexpected Revert
● Gas spent exceeds its limit on Contract via unbounded operations or
block stuffing
Miner Manipulation ● Block Number Dependence
● Timestamp Dependence
● Transaction Ordering Or Front-Running
External
Referencing
● Correct usage of the pull over push favor for external calls
● Correct usage of checks-effects-interactions pattern to minimize the
state changes after external contract or call referencing
● Avoid state changes after external calls
● Error handling and logging
Race Conditions ● Reentrancy - unexpected state changes when call.value()() occurs
● Cross-function racing - attacks that using different functions while
share the same state
Low-level Call ● Code Injection by delegatecall
● Unsuited adoption on assembly code
Visibility ● Specify the correct visibility of variables and functions
Incorrect Interface ● Ensure the defined function signatures match with the contract
interface and implementation
PROPRIETARY AND CONFIDENTIAL
PENTEST PROPOSAL CERTIK
WORKFLOW AND DELIVERABLES
As the leading security service provider in the industry, the CertiK team workflow prioritizes a
high quality service and an excellent customer experience.
Initial & Kick-Off Meetings with CertiK
● Bilaterally agree upon preferred communication channels, auditing goals, and action
items regarding: Infrastructure, product design, ecosystems, economy model, and
broader cybersecurity plans
Information Gathering, Project Research, Audit Planning, and Executions
● With all documents relevant to the client’s project, perform an in-depth review,
formalizing structures and plans by decomposing into smaller, auditable pieces
● Conduct the assessments based upon different approaches and methodologies,
including manual, static, and dynamic analyses that are feasible for the corresponding
project
Preliminary Reports
● Deliver preliminary (or weekly) reports to highlight
findings/vulnerabilities/recommendations that could help the client utilize the results
and address patches or updates quickly (Remediation Window)
Re-Audits
● Re-audit the design and the code changes implemented after the assessment period,
holding engineering meetings, if necessary, for further discussions
Further Iterations
● Repeat the steps above to improve the code quality until acceptable security
confidence is reached
Final Report
● Deliver a comprehensive report that includes all the details and practices of the audit
project, which may serve as a certificate for cryptocurrency exchanges or a technical
document for the client’s engineering team to utilize as a reference
PROPRIETARY AND CONFIDENTIAL
PENTEST PROPOSAL CERTIK
WORKFLOW AND DELIVERABLES
CertiK actively engages with clients by presenting outputs that help clients detect potential
vulnerabilities and improve the overall engineering quality. To highlight the auditing
deliverables:
CertiK actively engages with clients by presenting outputs that help clients detect potential
vulnerabilities and improve the overall engineering quality. To highlight the auditing
deliverables:
Communication Channels
● Real-time discussions and interactions via platforms like Slack, Telegram, and email
Dedicated Engineering Hours
● Standby around the clock to collaborate with the client’s team about security-focused
tech stacks, as well as general engineering practices that may help improve the overall
quality of the project
Audit Reports
● Comprehensive list of vulnerabilities with detailed explanations to identify and resolve
the issues
● Supporting materials for full transparency and understanding, including scripts or
artifacts that CertiK leveraged to reproduce bugs and outputs
PROPRIETARY AND CONFIDENTIAL
PENTEST PROPOSAL CERTIK
WHY CERTIK?
CertiK leads blockchain and smart contract security by pioneering the use of cutting-edge
technologies, including static/dynamic analysis and Formal Verification. Auditing is among one
of the premium solutions that CertiK offers to its clients in its mission to verify and ensure the
correctness and security of software. CertiK also contributes to the technical communities and
ecosystems by providing guidance, research, and advisory about blockchain and smart
contract best practices. To date, CertiK has served more than 700 clients and secured over
$30B in digital assets across all major protocols.
CertiK was founded by Computer Science professors from Yale University and Columbia
University, with its technologies derived from years of research in academia. CertiK is backed
by notable investors including Coatue, Binance, Lightspeed Venture Partners, Shunwei Capital,
and IDG. Additionally, CertiK has received grants from IBM, the Qtum Foundation, and the
Ethereum Foundation to support its research of improving security across the blockchain
industry.
Trusted by the leading clients
PROPRIETARY AND CONFIDENTIAL