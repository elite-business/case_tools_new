import { Result, Button } from 'antd';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <Result
        status="404"
        title="404"
        subTitle="Sorry, the page you visited does not exist."
        extra={
          <Link href="/dashboard">
            <Button type="primary">Back to Dashboard</Button>
          </Link>
        }
      />
    </div>
  );
}