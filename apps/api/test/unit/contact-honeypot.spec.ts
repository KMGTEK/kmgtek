import { LeadsService } from '../../src/modules/leads/leads.service';
import { EVENTS } from '../../src/modules/events/event-names';

const BASE_INPUT = {
  name: 'Jane Prospect',
  email: 'jane@example.com',
  message: 'We would like a quote for a cloud migration project, please get in touch soon.',
};

function buildService() {
  const contactLead = { create: jest.fn().mockResolvedValue({ id: 'lead-1' }) };
  const prisma = { contactLead };
  const events = { emit: jest.fn() };
  const service = new LeadsService(prisma as never, events as never);
  return { service, prisma, events };
}

describe('LeadsService.createFromContactForm — honeypot', () => {
  it('creates a lead and emits LEAD_CREATED when the honeypot is empty', async () => {
    const { service, prisma, events } = buildService();

    const result = await service.createFromContactForm({ ...BASE_INPUT, website: '' } as never, { ip: '1.2.3.4' });

    expect(result).toEqual({ id: 'lead-1' });
    expect(prisma.contactLead.create).toHaveBeenCalledTimes(1);
    expect(events.emit).toHaveBeenCalledWith(EVENTS.LEAD_CREATED, { leadId: 'lead-1' });
  });

  it('silently accepts without creating a row when the honeypot is filled', async () => {
    const { service, prisma, events } = buildService();

    const result = await service.createFromContactForm(
      { ...BASE_INPUT, website: 'http://spambot.example' } as never,
      { ip: '5.6.7.8' },
    );

    expect(result).toEqual({ id: null });
    expect(prisma.contactLead.create).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('captures ip, source and defaults source to "contact-form"', async () => {
    const { service, prisma } = buildService();

    await service.createFromContactForm({ ...BASE_INPUT, website: '' } as never, {
      ip: '9.9.9.9',
      userAgent: 'jest-agent',
    });

    expect(prisma.contactLead.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ip: '9.9.9.9',
        userAgent: 'jest-agent',
        source: 'contact-form',
      }),
    });
  });

  it('preserves an explicit source when provided', async () => {
    const { service, prisma } = buildService();

    await service.createFromContactForm({ ...BASE_INPUT, website: '', source: 'service-page' } as never, {
      ip: '9.9.9.9',
    });

    expect(prisma.contactLead.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: 'service-page' }),
    });
  });
});
