import Link from "next/link";
import { notFound } from "next/navigation";
import { getIntake } from "../../../../api/intake";
import { DocumentArtifactPreview } from "../../../../components/document-artifact-preview";

export default async function IntakeDocumentPage({
  params
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const intake = await getIntake();
  const document = intake.documents.find((item) => item.id === documentId);
  if (!document) {
    notFound();
  }
  const rawDocumentHref = `/api/artifacts/${documentId}/content`;

  return (
    <main className="shell">
      <section className="hero compact">
        <div>
          <p className="eyebrow">Document preview</p>
          <h1>{document.fileName}</h1>
          <p className="hero-copy">
            Review the submitted source document in-app. Use the raw document link only if you need
            the browser&apos;s native file handling.
          </p>
          <div className="hero-actions">
            <Link className="button secondary" href="/intake">
              Back to intake
            </Link>
            <a className="button secondary" href={rawDocumentHref} target="_blank" rel="noreferrer">
              Open raw document
            </a>
          </div>
        </div>
      </section>

      <section className="panel">
        <DocumentArtifactPreview
          mimeType={document.mimeType}
          documentName={document.fileName}
          rawDocumentHref={rawDocumentHref}
          sectionClassName="intake-section"
        />
      </section>
    </main>
  );
}
