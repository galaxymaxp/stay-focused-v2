# 2. Firewalls

## Learning Objectives

- Understand the role of physical design in the implementation of a comprehensive security program
- Understand firewall technology and the various approaches to firewall implementation
- Identify the various approaches to remote and dial-up access protection
- Understand content filtering technology
- Describe the technology that enables the use of Virtual Private Networks

## Introduction

- Technical Control
- Hardware and software components that protect a system against cyberattacks
- Can Improve an organization’s ability to balance various objectives in the CIA triad

## Physical Design

- Physical Design: Security Technologies
- Physical Design: Physical Security
- Extends to the logical design of the program
- Encompasses the selection and the implementation of technologies

## Physical Design Process

- 1. Select specific technologies
- 2. Identify technical solution based on these technologies (deployment, operations, and maintenance)
- 3. Design Physical Security measures to support the technical solution
- 4. Prepare project plans for the implementation

## Firewalls

- An information security program similar that prevents specific types of information from moving between the outside world and the inside world.
- Can be a separate computer system, a software service running on a router or server, or a separate network containing a number of supporting devices

## Firewall Categorization

- Can be categorized by:
- Processing Mode
- Development Era
- Structure

## Packet Filtering

Examines header information of data packets that come into a network.

- Also called filtering firewall
- Inspects packets at the network layer
- Based on: IP address, direction (in or out), TCP/UDP ports

## Application-Level Gateways

- Also called proxy firewall
- Uses proxy server to work as mediator
- For organizations that runs a web server can avoid exposing the user to direct traffic

## Circuit-level Gateways

- Operates at the transport layer and session level
- Acts as the handshaking device between trusted clients or servers to untrusted hosts and vice versa

## MAC-layer Firewalls

Gives the firewall the ability to consider the specific host identity in filtering decisions.

- Operates at the MAC layer
- Linked to ACL entries that identify the specific types of packets that can be sent to each host, and all other traffic is blocked

## Hybrids

- Combines elements of other types of firewalls
- Packet filtering and proxy services
- Packet filtering and circuit gateways
- May consist of two separate firewall devices but work in tandem

## First Generation

- Packet Filter firewalls
- Stateless
- Each packet it treated in isolation
- It does not recognize packets being part of an existing connection, is trying to establish a new connection, or is just a rogue packet: FTP connections opens new connections to random ports by design

## Second Generation

- Circuit level gateways
- Stateful
- Keeps tracks of network connections
- Holds in memory significant attributes of each connection

## Third Generation

- Application Firewalls
- a form of firewall that controls input/output or system calls of an application or service
- New Generation Firewall (NGFW)
- Stateful
- Signature based intrusion detection
- Primarily distributed as a connected ecosystem of products

## Commercial Grade

- Firewall application running on a general-purpose computer
- Can also be purchased hardware configured to specs that maximize performance

## SOHO Firewall

Serves as a stateful firewall to enable inside-to- outside access.

- Small Office/Home Office
- Connect the user’s local area network or a specific computer system to the internet
- Can be configured by use

## Residential Grade

- Installed directly into the user’s system
- Some apps combine firewall services with antivirus or intrusion detection features
- Limited configurability

## Packet Filtering Routers

They can be configured to reject packets that the organization does not allow.

- Most organizations use a router to connect to the internet
- Disadvantages: Lack of auditing
- Disadvantages: Lack of strong authentication
- Disadvantages: Can degrade network performance

## Screened Host Firewalls

Combines packet filtering with a separate dedicated firewall (like a proxy server).

- Allows the router to pre-screen packets to minimize network traffic
- Application proxy examines at the application layer
- Separate host = sacrificial host
- Requires external attack to compromise system

## Dual-homes Firewalls

- Two Network Interface Cards: One for external network; one for internal network
- Additional protection: All traffic goes through the firewall
- Implementation makes use of NAT: Method of mapping assigned IP to special ranges of nonroutable IP

## Screened Subnet Firewalls

- The current dominant architecture
- Implemented with a DMZ
- Common Implementation: Connections from untrusted networks are routed through an external filtering router
- Common Implementation: Connections from the untrusted networks are routed into a separate segment called the DMZ
- Common Implementation: Connections from trusted networks are allowed through the DMZ

## BEST PRACTICES FOR FIREWALLS

- All traffic from the trusted network is allowed. Filtering and logging of outbound traffic are possible when indicated by specific organizational policies.
- FW device is never directly accessible from the public network for configuration or management purposes.
- ICMP should be denied.
- Remote access to all internal servers from the public networks should be blocked.
- HTTP traffic should be denied if web services are offered to the internet.
- Block traffic by default and monitor user access.
- Establish a firewall configuration change plan.
- Optimize the firewall rules of your network.
- Update your firewall software regularly.
- Conduct regular firewall security audits.
- Have a centralized management tool for multi-vendor firewalls.
- Automate the process of firewall updating.
