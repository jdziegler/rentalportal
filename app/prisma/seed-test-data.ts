import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fictional test tenant for QA screenshots
const TEST_TENANT_EMAIL = "jane.tenant@example.com";

async function main() {
  // Get the first user (landlord)
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user found — run the app first");

  // Get a property with units
  const property = await prisma.property.findFirst({
    where: { userId: user.id },
    include: { units: { take: 2, include: { leases: { where: { leaseStatus: 0 } } } } },
  });
  if (!property || property.units.length === 0) throw new Error("No property with units found");

  const unit = property.units[0];

  // Check if test tenant already exists
  let contact = await prisma.contact.findFirst({
    where: { email: TEST_TENANT_EMAIL, userId: user.id },
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        userId: user.id,
        firstName: "Jane",
        lastName: "Doe",
        email: TEST_TENANT_EMAIL,
        phone: "5551234567",
        role: "tenant",
        status: 0,
        address: "42 Elm Street",
        city: "Bloomfield",
        state: "NJ",
        zip: "07003",
      },
    });
    console.log(`Created test contact: ${contact.firstName} ${contact.lastName} (${contact.email})`);
  } else {
    console.log(`Test contact already exists: ${contact.email}`);
  }

  // Create a lease if one doesn't exist for this contact
  let lease = await prisma.lease.findFirst({
    where: { contactId: contact.id, leaseStatus: 0 },
  });

  if (!lease) {
    lease = await prisma.lease.create({
      data: {
        userId: user.id,
        unitId: unit.id,
        contactId: contact.id,
        name: "Test Lease",
        leaseType: 1,
        leaseStatus: 0,
        rentAmount: 1650,
        rentDueDay: 1,
        gracePeriod: 5,
        rentFrom: new Date("2025-06-01"),
        rentTo: new Date("2026-05-31"),
        deposit: 2475,
        currency: "USD",
      },
    });
    console.log(`Created test lease: ${lease.id}`);
  } else {
    console.log(`Test lease already exists: ${lease.id}`);
  }

  // Create maintenance requests
  const existingMaint = await prisma.maintenanceRequest.count({
    where: { userId: user.id },
  });

  if (existingMaint === 0) {
    const maintenanceData = [
      {
        title: "Kitchen faucet leaking",
        description: "The kitchen faucet has been dripping steadily for the past two days. Water pools under the sink cabinet. Needs repair ASAP before it damages the floor.",
        priority: 2, // High
        status: 0,   // Open
        category: "plumbing",
        propertyId: property.id,
        unitId: unit.id,
        contactId: contact.id,
      },
      {
        title: "Bathroom light fixture flickering",
        description: "The ceiling light in the main bathroom flickers intermittently. Tried replacing the bulb but the issue persists. Might be a wiring problem.",
        priority: 1, // Medium
        status: 1,   // In Progress
        category: "electrical",
        propertyId: property.id,
        unitId: unit.id,
        contactId: contact.id,
      },
      {
        title: "HVAC not cooling properly",
        description: "The air conditioning is running but not reaching the set temperature. It's about 10 degrees warmer than the thermostat setting. Filter was replaced last month.",
        priority: 3, // Urgent
        status: 0,   // Open
        category: "hvac",
        propertyId: property.id,
        unitId: property.units[1]?.id || unit.id,
        contactId: contact.id,
      },
      {
        title: "Front door lock sticking",
        description: "The deadbolt on the front door is difficult to turn. Have to jiggle the key to get it to lock/unlock. Concerned about security.",
        priority: 2, // High
        status: 2,   // Completed
        category: "general",
        propertyId: property.id,
        unitId: unit.id,
        contactId: contact.id,
        completedAt: new Date("2026-02-28"),
      },
      {
        title: "Dishwasher not draining",
        description: "After running a cycle, there's standing water at the bottom of the dishwasher. Tried cleaning the filter but it didn't help.",
        priority: 1, // Medium
        status: 0,   // Open
        category: "appliance",
        propertyId: property.id,
        unitId: unit.id,
        contactId: contact.id,
      },
    ];

    for (const data of maintenanceData) {
      await prisma.maintenanceRequest.create({
        data: { userId: user.id, ...data },
      });
    }
    console.log(`Created ${maintenanceData.length} maintenance requests`);
  } else {
    console.log(`Maintenance requests already exist (${existingMaint})`);
  }

  // Create a few messages on the lease
  const existingMessages = await prisma.message.count({
    where: { leaseId: lease.id },
  });

  if (existingMessages === 0) {
    const messages = [
      {
        body: "Hi Jane, just a reminder that rent is due on the 1st. Let me know if you have any questions about the lease.",
        sender: "landlord",
        createdAt: new Date("2026-03-01T09:00:00"),
      },
      {
        body: "Thanks for the reminder! I'll have the payment sent by end of day. Also, the kitchen faucet started leaking — I submitted a maintenance request.",
        sender: "tenant",
        createdAt: new Date("2026-03-01T10:30:00"),
      },
      {
        body: "Got the maintenance request. I'll have a plumber come by on Wednesday between 10am-12pm. Will that work for you?",
        sender: "landlord",
        createdAt: new Date("2026-03-01T14:15:00"),
      },
      {
        body: "Wednesday works perfectly. I'll make sure someone is home. Thank you!",
        sender: "tenant",
        createdAt: new Date("2026-03-01T15:00:00"),
      },
    ];

    for (const msg of messages) {
      await prisma.message.create({
        data: {
          userId: user.id,
          contactId: contact.id,
          leaseId: lease.id,
          ...msg,
        },
      });
    }
    console.log(`Created ${messages.length} messages`);
  } else {
    console.log(`Messages already exist (${existingMessages})`);
  }

  console.log(`\nTest tenant login: ${TEST_TENANT_EMAIL}`);
  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
